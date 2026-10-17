import { beforeEach, describe, expect, test, vi } from 'vitest'

import { CLASSES } from '../../lib/common'
import * as edit from '../../lib/edit'
import { data } from '../../lib/mesh'
import { sam } from '../../lib/sam'
import type { Reply, Request } from '../../lib/sam.worker'
import { doc, prompts, ui } from '../../lib/state'
import { cancel, finish, mask, smart } from '../../lib/tools/smart'
import { view } from '../../lib/view'
import { at, grid, labeled, load, look } from './fixtures'

/** Stands in for EdgeTAM's worker: records requests, replies on demand. */
class FakeWorker {
  static last: FakeWorker
  sent: Request[] = []
  onmessage?: (e: { data: Reply }) => void
  constructor() {
    FakeWorker.last = this
  }
  postMessage(req: Request) {
    this.sent.push(req)
  }
  reply(data: Reply) {
    this.onmessage?.({ data })
  }
  terminate() {}
}
vi.stubGlobal('Worker', FakeWorker)

const worker = () => FakeWorker.last
const handlers = { ready: vi.fn(), mask: vi.fn() }

/** A mask covering the screen square around (x, y) in the loaded space. */
function square(x: number, y: number, half: number) {
  const out = new Uint8Array(view.width * view.height)
  const [cx, cy] = at(x, y)
  for (let j = Math.floor(cy - half); j < cy + half; j++)
    for (let i = Math.floor(cx - half); i < cx + half; i++)
      out[j * view.width + i] = 1
  return out
}

const release = { click: false, long: false, alt: false }

beforeEach(async () => {
  vi.clearAllMocks()
  await load({ Plane: grid(20, () => 0) })
  doc.set({ classes: CLASSES, active: 0, parts: data.parts })
  edit.forget()
  edit.sync()
  look()
  sam.stop()
  sam.start(handlers)
  worker().reply({ type: 'ready' })
  view.frame = {
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  } as ImageData
  sam.encode()
})

describe('the model client', () => {
  test('loads the model, then encodes each view once', () => {
    expect(worker().sent.map((r) => r.type)).toEqual(['load', 'encode'])
    expect(handlers.ready).toHaveBeenCalled()
    expect(ui.get().status).toBe('encoding')
    const { id } = worker().sent.at(-1) as { id: number }
    worker().reply({ type: 'encoded', id })
    expect(ui.get().status).toBe('ready')
  })

  test('drops a mask for a view that has moved on', () => {
    const encoded = () => (worker().sent.at(-1) as { id: number }).id
    const old = encoded()
    sam.encode()
    worker().reply({ type: 'mask', id: old, mask: new Uint8Array(1) })
    expect(handlers.mask).not.toHaveBeenCalled()
    worker().reply({ type: 'mask', id: encoded(), mask: new Uint8Array(1) })
    expect(handlers.mask).toHaveBeenCalledOnce()
  })

  test('an error says so', () => {
    worker().reply({ type: 'error', message: 'no WebGPU' })
    expect(ui.get().status).toBe('error')
  })
})

describe('Smart Select', () => {
  test('a dragged box is sent as a box, corners in order', () => {
    smart.release!(...at(0.2, -0.2), { ...release, from: at(-0.2, 0.2) })
    const decode = worker().sent.at(-1)
    expect(decode).toMatchObject({ type: 'decode', points: [] })
    const [x0, y0, x1, y1] = (decode as { box: number[] }).box
    expect(x0 < x1 && y0 < y1).toBe(true)
    expect(prompts.get().box).not.toBeNull()
  })

  test('clicks add points; Alt-click or a long press excludes', () => {
    const from = at(0, 0)
    smart.release!(...at(0, 0), { ...release, click: true, from })
    smart.release!(...at(0.1, 0), { ...release, click: true, alt: true, from })
    smart.release!(...at(0.2, 0), { ...release, click: true, long: true, from })
    expect(prompts.get().points.map((p) => p.positive)).toEqual([
      true,
      false,
      false,
    ])
  })

  test('labels what the mask covers, live, as one undo step', () => {
    mask(square(0, 0, 60))
    const first = labeled(0)
    expect(first).toBeGreaterThan(0)
    expect(ui.get()).toMatchObject({ selecting: true, past: 1 })
    // A refined mask redoes the selection from scratch, still one step.
    mask(square(0, 0, 20))
    expect(labeled(0)).toBeLessThan(first)
    expect(ui.get().past).toBe(1)
  })

  test('picking a class mid-selection relabels it', () => {
    mask(square(0, 0, 60))
    const n = labeled(0)
    doc.set({ active: 2 })
    smart.reclass!()
    expect(labeled(2)).toBe(n)
    expect(labeled(0)).toBe(0)
  })

  test('Apply keeps the labels and ends the selection', () => {
    mask(square(0, 0, 60))
    const n = labeled()
    finish()
    expect(labeled()).toBe(n)
    expect(data.base).toBeNull()
    expect(ui.get().selecting).toBe(false)
    expect(prompts.get()).toEqual({ points: [], box: null })
  })

  test('Esc undoes the selection as if it never happened', () => {
    edit.snapshot()
    edit.paint([0], 1)
    mask(square(0, 0, 60))
    expect(cancel()).toBe(true)
    expect(labeled()).toBe(1)
    expect(ui.get()).toMatchObject({ past: 1, future: 0, selecting: false })
    expect(cancel()).toBe(false)
  })
})
