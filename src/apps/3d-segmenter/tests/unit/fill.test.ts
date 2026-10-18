import { beforeEach, describe, expect, test } from 'vitest'

import { CLASSES } from '../../lib/common'
import * as edit from '../../lib/edit'
import { data } from '../../lib/mesh'
import { doc, ui } from '../../lib/state'
import { fill } from '../../lib/tools/fill'
import { view } from '../../lib/view'
import { at, grid, labeled, load, look } from './fixtures'

const release = { click: true, long: false, alt: false, from: [0, 0] as const }

/** Two halves of a plane meeting along a groove at x = 0, like two teeth. */
beforeEach(async () => {
  await load({
    Plane: grid(40, (x) => -0.4 * Math.max(0, 1 - Math.abs(x) / 0.1)),
  })
  doc.set({ classes: CLASSES, active: 0, parts: data.parts })
  ui.set({ radius: 160 })
  view.shift = false
  edit.forget()
  edit.sync()
  look()
})

const x = (v: number) => data.geometry!.getAttribute('position').getX(v)
const side = (sign: number) =>
  [...data.labels.keys()].filter(
    (v) => data.labels[v] === 0 && Math.sign(x(v)) === sign,
  ).length

describe('Fill', () => {
  test('a click fills within the ring, up to the groove', () => {
    fill.press!(...at(-0.3, 0))
    fill.release!(...at(-0.3, 0), release)
    expect(side(-1)).toBeGreaterThan(0)
    expect(side(1)).toBe(0)
  })

  test('the ring limits its reach', () => {
    ui.set({ radius: 20 })
    fill.press!(...at(-0.5, 0))
    fill.release!(...at(-0.5, 0), release)
    const small = labeled()
    edit.undo()
    ui.set({ radius: 80 })
    fill.press!(...at(-0.5, 0))
    fill.release!(...at(-0.5, 0), release)
    expect(labeled()).toBeGreaterThan(small)
  })

  test('held Shift takes the whole piece, groove and all', () => {
    view.shift = true
    fill.press!(...at(-0.3, 0))
    fill.release!(...at(-0.3, 0), release)
    expect(labeled()).toBe(data.labels.length)
  })

  test('the Shift preview is exactly what a Shift-click takes', () => {
    view.shift = true
    fill.hover!(at(-0.3, 0))
    const previewed = data.preview.drawRange.count
    fill.press!(...at(-0.3, 0))
    fill.release!(...at(-0.3, 0), release)
    expect(previewed).toBe(data.triangles.length)
  })

  test('a drag is one undo step', () => {
    fill.press!(...at(-0.6, 0))
    fill.drag!(...at(-0.6, 0.5))
    fill.drag!(...at(-0.6, -0.5))
    fill.release!(...at(-0.6, -0.5), { ...release, click: false })
    expect(ui.get().past).toBe(1)
    edit.undo()
    expect(labeled()).toBe(0)
  })

  test('a drag stays on the side it started on, even across the groove', () => {
    fill.press!(...at(-0.4, 0))
    fill.drag!(...at(-0.1, 0))
    fill.drag!(...at(0.2, 0))
    fill.drag!(...at(0.5, 0))
    fill.release!(...at(0.5, 0), { ...release, click: false })
    expect(side(-1)).toBeGreaterThan(0)
    expect(side(1)).toBe(0)
  })

  test('starting inside the groove opens it, but not the side beyond', () => {
    fill.press!(...at(0, 0))
    fill.release!(...at(0, 0), release)
    expect(labeled()).toBeGreaterThan(0)
    expect(labeled()).toBeLessThan(data.labels.length)
  })

  test('stops at another class', () => {
    const band = (v: number) => x(v) > -0.45 && x(v) < -0.35
    data.labels.forEach((_, v) => band(v) && (data.labels[v] = 1))
    const before = labeled(1)
    fill.press!(...at(-0.6, 0))
    fill.release!(...at(-0.6, 0), release)
    expect(labeled(1)).toBe(before)
    expect(
      [...data.labels.keys()].some((v) => data.labels[v] === 0 && x(v) > -0.35),
    ).toBe(false)
  })

  test('refills an area it starts on, so a class can be swapped', () => {
    data.labels.forEach((_, v) => x(v) < 0 && (data.labels[v] = 1))
    fill.press!(...at(-0.6, 0))
    fill.release!(...at(-0.6, 0), release)
    expect(labeled(0)).toBeGreaterThan(0)
  })

  test('a long press takes the whole piece', () => {
    fill.press!(...at(-0.3, 0))
    fill.release!(...at(-0.3, 0), { ...release, long: true })
    expect(labeled()).toBe(data.labels.length)
  })

  test('abort undoes the stroke so far', () => {
    fill.press!(...at(-0.3, 0))
    fill.abort!()
    expect(labeled()).toBe(0)
    expect(ui.get()).toMatchObject({ past: 0, future: 0 })
  })
})

test('a big flat face fills from anywhere on it, far from its corners', async () => {
  await load({ Quad: grid(1, () => 0) })
  doc.set({ classes: CLASSES, active: 0, parts: data.parts })
  ui.set({ radius: 20 })
  edit.forget()
  edit.sync()
  look()
  fill.press!(...at(0.3, -0.2))
  fill.release!(...at(0.3, -0.2), release)
  expect(labeled()).toBe(3)
})
