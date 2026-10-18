import type { Box, Point } from './common'
import type { Reply, Request } from './sam.worker'
import { notify, ui } from './state'
import { view } from './view'

/**
 * The client for EdgeTAM's worker. Each capture is a view: encoded once,
 * then decoded per prompt. A reply for an older view is dropped.
 */

let worker: Worker | undefined
let ready = false
let viewId = 0
/** The last view a prompt was sent for. */
let asked = 0

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
          return ui.set({ loaded: reply.loaded, total: reply.total })
        case 'ready':
          ready = true
          return on.ready()
        // Loading lasts through the first view's encoding, and the answer to
        // a prompt that waited for it, so the status says one thing until
        // it's usable.
        case 'encoded': {
          const { status } = ui.get()
          if (reply.id !== viewId) return
          if (
            status === 'encoding' ||
            (status === 'loading' && asked !== viewId)
          )
            ui.set({ status: 'ready' })
          return
        }
        case 'mask':
          if (reply.id === viewId) on.mask(reply.mask)
          return
        case 'error':
          console.error(reply.message)
          if (reply.fatal) return ui.set({ status: 'error' })
          notify('Smart Select failed on this view · try again')
          return ui.set({ status: 'ready' })
      }
    }
    send({ type: 'load' })
  },

  stop() {
    worker?.terminate()
    worker = undefined
    ready = false
    ui.set({ status: 'loading', loaded: 0, total: 0 })
  },

  moved() {
    if (ready && ui.get().status !== 'loading') ui.set({ status: 'moving' })
  },

  /** Encodes the last captured frame: the expensive half, once per view. */
  encode() {
    const frame = view.frame
    if (!ready || !frame) return
    viewId++
    const { data, width, height } = frame
    send({ type: 'encode', id: viewId, data, width, height })
    if (ui.get().status !== 'loading') ui.set({ status: 'encoding' })
  },

  decode(points: Point[], box: Box | null) {
    if (!ready) return
    if (ui.get().status !== 'loading') ui.set({ status: 'decoding' })
    asked = viewId
    send({ type: 'decode', id: viewId, points, box })
  },
}
