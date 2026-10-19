import { beforeAll, beforeEach, describe, expect, test } from 'vitest'

import { api } from '../../lib/api'
import { wire } from '../../lib/app'
import * as editor from '../../lib/editor'
import { doc } from '../../lib/core'
import * as mesh from '../../lib/mesh'
import * as session from '../../lib/session'
import { fill, move } from '../../lib/tools'
import { at, grid, labeled, load, look } from './fixtures'

const release = { click: true, long: false, alt: false, from: [0, 0] as const }
const all = () => [...doc.labels.peek().keys()]
const past = () => doc.history.value.past.length

/** A click: press and release in place. */
function click(x: number, y: number, how = release) {
  editor.input.press(...at(x, y))
  editor.input.release(...at(x, y), how)
}

beforeAll(wire)

/** Two halves of a plane meeting along a groove at x = 0, like two teeth. */
beforeEach(async () => {
  await load({
    Plane: grid(40, (x) => -0.4 * Math.max(0, 1 - Math.abs(x) / 0.1)),
  })
  api.setTool(fill.tool)
  session.radius.value = 160
  session.shift.value = false
  session.pointer.value = null
  look()
})

const x = (v: number) => mesh.data.geometry!.getAttribute('position').getX(v)
const side = (sign: number) =>
  all().filter((v) => doc.labels.peek()[v] === 0 && Math.sign(x(v)) === sign)
    .length

describe('Fill', () => {
  test('a click fills within the ring, up to the groove', () => {
    click(-0.3, 0)
    expect(side(-1)).toBeGreaterThan(0)
    expect(side(1)).toBe(0)
  })

  test('the ring limits its reach', () => {
    session.radius.value = 20
    click(-0.5, 0)
    const small = labeled()
    doc.undo()
    session.radius.value = 80
    click(-0.5, 0)
    expect(labeled()).toBeGreaterThan(small)
  })

  test('held Shift takes the whole piece, groove and all', () => {
    session.shift.value = true
    click(-0.3, 0)
    expect(labeled()).toBe(doc.labels.peek().length)
  })

  test('the Shift preview is exactly what a Shift-click takes', () => {
    session.shift.value = true
    editor.input.hover(...at(-0.3, 0))
    expect(mesh.data.preview.drawRange.count).toBe(mesh.data.triangles.length)
  })

  test('the preview clears while a drag is underway, and comes back after', () => {
    editor.input.hover(...at(-0.3, 0))
    expect(mesh.data.preview.drawRange.count).toBeGreaterThan(0)
    editor.input.press(...at(-0.3, 0))
    expect(mesh.data.preview.drawRange.count).toBe(0)
    editor.input.release(...at(-0.3, 0), release)
    expect(mesh.data.preview.drawRange.count).toBeGreaterThan(0)
  })

  test('switching tools clears the preview', () => {
    editor.input.hover(...at(-0.3, 0))
    api.setTool(move.tool)
    expect(mesh.data.preview.drawRange.count).toBe(0)
    api.setTool(fill.tool)
  })

  test('a drag is one undo step', () => {
    editor.input.press(...at(-0.6, 0))
    editor.input.drag(...at(-0.6, 0.5))
    editor.input.drag(...at(-0.6, -0.5))
    editor.input.release(...at(-0.6, -0.5), { ...release, click: false })
    expect(past()).toBe(1)
    doc.undo()
    expect(labeled()).toBe(0)
  })

  test('a drag stays on the side it started on, even across the groove', () => {
    editor.input.press(...at(-0.4, 0))
    editor.input.drag(...at(-0.1, 0))
    editor.input.drag(...at(0.2, 0))
    editor.input.drag(...at(0.5, 0))
    editor.input.release(...at(0.5, 0), { ...release, click: false })
    expect(side(-1)).toBeGreaterThan(0)
    expect(side(1)).toBe(0)
  })

  test('starting inside the groove opens it, but not the side beyond', () => {
    click(0, 0)
    expect(labeled()).toBeGreaterThan(0)
    expect(labeled()).toBeLessThan(doc.labels.peek().length)
  })

  test('stops at another class', () => {
    const band = (v: number) => x(v) > -0.45 && x(v) < -0.35
    doc.transact((tx) => tx.paint(all().filter(band), 1))
    const before = labeled(1)
    click(-0.6, 0)
    expect(labeled(1)).toBe(before)
    expect(all().some((v) => doc.labels.peek()[v] === 0 && x(v) > -0.35)).toBe(
      false,
    )
  })

  test('refills an area it starts on, so a class can be swapped', () => {
    doc.transact((tx) =>
      tx.paint(
        all().filter((v) => x(v) < 0),
        1,
      ),
    )
    click(-0.6, 0)
    expect(labeled(0)).toBeGreaterThan(0)
  })

  test('a long press takes the whole piece', () => {
    click(-0.3, 0, { ...release, long: true })
    expect(labeled()).toBe(doc.labels.peek().length)
  })

  test('abort undoes the stroke so far, with no step', () => {
    editor.input.press(...at(-0.3, 0))
    editor.input.abort()
    expect(labeled()).toBe(0)
    expect(doc.history.value).toEqual({ past: [], future: [] })
  })
})

test('a big flat face fills from anywhere on it, far from its corners', async () => {
  await load({ Quad: grid(1, () => 0) })
  session.radius.value = 20
  look()
  click(0.3, -0.2)
  expect(labeled()).toBe(3)
})
