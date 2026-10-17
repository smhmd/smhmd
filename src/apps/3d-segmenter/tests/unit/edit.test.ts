import { BoxGeometry } from 'three'
import { beforeEach, describe, expect, test } from 'vitest'

import { CLASSES } from '../../lib/common'
import * as edit from '../../lib/edit'
import { data } from '../../lib/mesh'
import { doc, ui } from '../../lib/state'
import { labeled, load } from './fixtures'

const count = (id: number) => doc.get().classes.find((c) => c.id === id)!.count

beforeEach(async () => {
  await load({ Box: new BoxGeometry() })
  doc.set({ classes: CLASSES, active: 0, parts: data.parts })
  edit.forget()
})

/** One stroke: a snapshot, labels written, then a recount. */
function stroke(vertices: number[], id = 0) {
  edit.snapshot()
  edit.paint(vertices, id)
  edit.recount()
}

describe('history', () => {
  test('undo and redo restore labels and counts', () => {
    stroke([0, 1, 2])
    stroke([3])
    expect(count(0)).toBe(4)
    edit.undo()
    expect(labeled()).toBe(3)
    expect(count(0)).toBe(3)
    expect(ui.get()).toMatchObject({ past: 1, future: 1 })
    edit.redo()
    expect(labeled()).toBe(4)
    expect(ui.get()).toMatchObject({ past: 2, future: 0 })
  })

  test('a new edit clears the redo stack', () => {
    stroke([0])
    edit.undo()
    stroke([1])
    expect(ui.get().future).toBe(0)
  })

  test('discard drops a stroke without a redo step', () => {
    stroke([0])
    edit.snapshot()
    edit.paint([1, 2], 0)
    edit.discard()
    expect(labeled()).toBe(1)
    expect(ui.get()).toMatchObject({ past: 1, future: 0 })
  })

  test('visibility is not an edit, so undo leaves it alone', () => {
    stroke([0])
    doc.set({
      classes: doc.get().classes.map((c) => ({ ...c, hidden: c.id === 0 })),
    })
    edit.undo()
    expect(doc.get().classes[0].hidden).toBe(true)
  })

  test('keeps the last 50 steps', () => {
    for (let i = 0; i < 60; i++) stroke([i % data.labels.length])
    expect(ui.get().past).toBe(50)
  })
})

describe('classes', () => {
  test('painting without an active class creates one', () => {
    doc.set({ classes: [], active: -1 })
    const id = edit.target()
    expect(doc.get().classes.map((c) => c.id)).toEqual([id])
    expect(doc.get().active).toBe(id)
  })

  test('new classes take the next id and palette color', () => {
    edit.addClass()
    const added = doc.get().classes.at(-1)!
    expect(added.id).toBe(CLASSES.length)
    expect(added.color).not.toBe(CLASSES.at(-1)!.color)
  })
})
