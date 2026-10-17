import type { Box, Point } from './common'
import type { Reply, Request } from './sam.worker'
import { ui } from './state'
import { view } from './view'

/**
 * The client for EdgeTAM's worker. Each capture is a view: encoded once,
 * then decoded per prompt. A reply for an older view is dropped.
 */

let worker: Worker | undefined
let ready = false
let viewId = 0

const send = (req: Request) => worker?.postMessage(req)

type Handlers = { ready(): void; mask(mask: Uint8Array): void }

export const sam = {
  get ready() {
    return ready
  },

  start(on: Handlers) {
    worker = new Worker(new URL('./sam.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = ({ data: reply }: MessageEvent<Reply>) => {
      switch (reply.type) {
        case 'progress':
          return ui.set({ progress: reply.value })
        case 'ready':
          ready = true
          return on.ready()
        case 'encoded':
          if (reply.id === viewId && ui.get().status === 'encoding')
            ui.set({ status: 'ready' })
          return
        case 'mask':
          if (reply.id === viewId) on.mask(reply.mask)
          return
        case 'error':
          console.error(reply.message)
          return ui.set({ status: 'error' })
      }
    }
    send({ type: 'load' })
  },

  stop() {
    worker?.terminate()
    worker = undefined
    ready = false
    ui.set({ status: 'loading', progress: 0 })
  },

  moved() {
    if (ready) ui.set({ status: 'moving' })
  },

  /** Encodes the last captured frame: the expensive half, once per view. */
  encode() {
    const frame = view.frame
    if (!ready || !frame) return
    viewId++
    const { data, width, height } = frame
    send({ type: 'encode', id: viewId, data, width, height })
    ui.set({ status: 'encoding' })
  },

  decode(points: Point[], box: Box | null) {
    if (!ready) return
    ui.set({ status: 'decoding' })
    send({ type: 'decode', id: viewId, points, box })
  },
}
