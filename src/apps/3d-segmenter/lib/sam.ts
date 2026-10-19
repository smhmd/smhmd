import type { Box, Point } from './common'
import { computed, signal } from './core'
import type { Reply, Request } from './sam.worker'
import { notify } from './session'
import * as view from './view'

/**
 * The client for EdgeTAM's worker. Each capture is a view: encoded once,
 * then decoded per prompt. A reply for an older view is dropped.
 */

const model = signal<'loading' | 'ready' | 'error'>('loading')
/** What the worker is doing for the current view. */
const work = signal<'idle' | 'encoding' | 'decoding'>('idle')
/** It has answered once. Until then, the first load reads as one wait: the download, the first view, a prompt that waited for both. */
const warm = signal(false)

let worker: Worker | undefined
let viewId = 0
/** The last view a prompt was sent for. */
let asked = 0

const send = (req: Request) => worker?.postMessage(req)

export type Status =
  | 'loading'
  | 'moving'
  | 'encoding'
  | 'ready'
  | 'decoding'
  | 'error'

export const sam = {
  model: computed(() => model.value),
  /** EdgeTAM's download so far, in bytes. */
  progress: signal({ loaded: 0, total: 0 }),
  /** The answer to the last prompt, in the last capture's pixels. */
  mask: signal<Uint8Array | null>(null),
  /** What the status says: one wait while loading, then the work on the current view. */
  status: computed<Status>(() => {
    if (model.value === 'error') return 'error'
    if (model.value === 'loading' || !warm.value) return 'loading'
    if (view.stale.value) return 'moving'
    return work.value === 'idle' ? 'ready' : work.value
  }),

  start() {
    worker = new Worker(new URL('./sam.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = ({ data: reply }: MessageEvent<Reply>) => {
      switch (reply.type) {
        case 'progress':
          sam.progress.value = { loaded: reply.loaded, total: reply.total }
          return
        case 'ready':
          model.value = 'ready'
          return
        case 'encoded':
          if (reply.id !== viewId) return
          if (work.peek() === 'encoding') work.value = 'idle'
          if (asked !== viewId) warm.value = true
          return
        case 'mask':
          if (reply.id !== viewId) return
          work.value = 'idle'
          warm.value = true
          sam.mask.value = reply.mask
          return
        case 'error':
          console.error(reply.message)
          if (reply.fatal) model.value = 'error'
          else notify('Smart Select failed on this view · try again')
          work.value = 'idle'
          warm.value = true
      }
    }
    send({ type: 'load' })
  },

  stop() {
    worker?.terminate()
    worker = undefined
    model.value = 'loading'
    work.value = 'idle'
    warm.value = false
    sam.progress.value = { loaded: 0, total: 0 }
  },

  /** Encodes the last captured frame: the expensive half, once per view. */
  encode() {
    const frame = view.captured.peek()?.frame
    if (model.peek() !== 'ready' || !frame) return
    viewId++
    const { data, width, height } = frame
    send({ type: 'encode', id: viewId, data, width, height })
    work.value = 'encoding'
  },

  decode(points: Point[], box: Box | null) {
    if (model.peek() !== 'ready') return
    work.value = 'decoding'
    asked = viewId
    send({ type: 'decode', id: viewId, points, box })
  },
}
