import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

import { api } from '../../lib/api'
import { wire } from '../../lib/app'
import * as editor from '../../lib/editor'
import { doc } from '../../lib/core'
import { sam } from '../../lib/sam'
import type { Reply, Request } from '../../lib/sam.worker'
import * as session from '../../lib/session'
import { smart } from '../../lib/tools'
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
const types = () => worker().sent.map((r) => r.type)
/** The view the worker was last asked about. */
const last = () => (worker().sent.at(-1) as { id: number }).id
const past = () => doc.history.value.past.length

/** A mask covering the screen square around (x, y) in the loaded space. */
function square(x: number, y: number, half: number) {
  const width = 1000
  const out = new Uint8Array(width * width)
  const [cx, cy] = at(x, y)
  for (let j = Math.floor(cy - half); j < cy + half; j++)
    for (let i = Math.floor(cx - half); i < cx + half; i++)
      out[j * width + i] = 1
  return out
}

const release = { click: false, long: false, alt: false }
const frame = { data: new Uint8ClampedArray(4), width: 1, height: 1 }

/** A capture with the textured view, as Smart Select gets. */
const capture = () => look(frame as ImageData)

const click = (x: number, y: number, how = {}) =>
  editor.input.release(...at(x, y), {
    ...release,
    click: true,
    from: at(x, y),
    ...how,
  })

/** A click, and the model's answer: a square around it. */
function select(half = 60) {
  click(0, 0)
  worker().reply({ type: 'mask', id: last(), mask: square(0, 0, half) })
}

beforeAll(wire)

beforeEach(async () => {
  await load({ Plane: grid(20, () => 0) })
  api.setTool(smart.tool)
  sam.stop()
  sam.start()
  worker().reply({ type: 'ready' })
  capture()
})

describe('the model client', () => {
  test('loads the model, then encodes each view once', () => {
    expect(types()).toEqual(['load', 'encode'])
    worker().reply({ type: 'encoded', id: last() })
    expect(sam.status.value).toBe('ready')
    editor.cameraMoved()
    expect(sam.status.value).toBe('moving')
    capture()
    expect(types()).toEqual(['load', 'encode', 'encode'])
    expect(sam.status.value).toBe('encoding')
  })

  test('loading lasts through the first view, through any orbiting', () => {
    editor.cameraMoved()
    capture()
    expect(sam.status.value).toBe('loading')
    worker().reply({ type: 'encoded', id: last() })
    expect(sam.status.value).toBe('ready')
  })

  test('drops a mask for a view that has moved on', () => {
    click(0, 0)
    const old = last()
    capture()
    worker().reply({ type: 'mask', id: old, mask: new Uint8Array(1) })
    expect(sam.mask.value).toBeNull()
    worker().reply({ type: 'mask', id: last(), mask: new Uint8Array(1) })
    expect(sam.mask.value).not.toBeNull()
  })

  test('a model that never loads says so', () => {
    worker().reply({ type: 'error', message: 'offline', fatal: true })
    expect(sam.status.value).toBe('error')
  })

  test('one failed view is a passing notice, not a broken model', () => {
    worker().reply({ type: 'error', message: 'out of memory', fatal: false })
    expect(sam.status.value).toBe('ready')
    expect(session.notice.value).not.toBe('')
  })
})

describe('Smart Select', () => {
  test('a box drawn before the model is ready waits, then runs', () => {
    sam.stop()
    sam.start()
    editor.input.release(...at(0.2, -0.2), { ...release, from: at(-0.2, 0.2) })
    expect(smart.prompts.value.box).not.toBeNull()
    expect(types()).toEqual(['load'])
    worker().reply({ type: 'ready' })
    expect(types()).toEqual(['load', 'encode', 'decode'])
  })

  test('a dragged box is sent as a box, corners in order', () => {
    editor.input.release(...at(0.2, -0.2), { ...release, from: at(-0.2, 0.2) })
    const decode = worker().sent.at(-1)
    expect(decode).toMatchObject({ type: 'decode', points: [] })
    const [x0, y0, x1, y1] = (decode as { box: number[] }).box
    expect(x0 < x1 && y0 < y1).toBe(true)
  })

  test('clicks add points; Alt-click or a long press excludes', () => {
    click(0, 0)
    click(0.1, 0, { alt: true })
    click(0.2, 0, { long: true })
    expect(smart.prompts.value.points.map((p) => p.positive)).toEqual([
      true,
      false,
      false,
    ])
  })

  test('labels what the mask covers, live, kept as one undo step', () => {
    select(60)
    const first = labeled(0)
    expect(first).toBeGreaterThan(0)
    expect(smart.selecting.value).toBe(true)
    // A refined mask redoes the selection from scratch.
    worker().reply({ type: 'mask', id: last(), mask: square(0, 0, 20) })
    expect(labeled(0)).toBeLessThan(first)
    expect(past()).toBe(0)
    api.complete()
    expect(past()).toBe(1)
  })

  test('picking a class mid-selection relabels it', () => {
    select()
    const n = labeled(0)
    doc.activeId.value = 2
    expect(labeled(2)).toBe(n)
    expect(labeled(0)).toBe(0)
  })

  test('Apply keeps the labels and ends the selection', () => {
    select()
    const n = labeled()
    api.complete()
    expect(labeled()).toBe(n)
    expect(smart.selecting.value).toBe(false)
    expect(smart.prompts.value).toEqual({ points: [], box: null })
  })

  test('anything that edits first keeps the selection, as its own step', () => {
    select()
    api.clearClass(1)
    expect(smart.selecting.value).toBe(false)
    expect(past()).toBe(1)
  })

  test('orbiting keeps the selection', () => {
    select()
    editor.cameraMoved()
    expect(smart.selecting.value).toBe(false)
    expect(past()).toBe(1)
  })

  test('Esc undoes the selection as if it never happened', () => {
    doc.transact((tx) => tx.paint([0], 1))
    select()
    api.cancel()
    expect(labeled()).toBe(1)
    expect(doc.history.value.past).toHaveLength(1)
    expect(doc.history.value.future).toHaveLength(0)
    expect(smart.selecting.value).toBe(false)
  })

  test('Esc with no selection deselects the part instead', () => {
    session.selectedPart.value = 0
    api.cancel()
    expect(session.selectedPart.value).toBe(-1)
  })
})
