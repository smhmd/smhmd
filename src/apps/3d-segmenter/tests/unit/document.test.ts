import { BoxGeometry } from 'three'
import { beforeEach, describe, expect, test } from 'vitest'

import { doc } from '../../lib/core'
import * as mesh from '../../lib/mesh'
import { labeled, load } from './fixtures'

const count = (id: number) => mesh.tally.value.counts.get(id) ?? 0
const steps = () => ({
  past: doc.history.value.past.length,
  future: doc.history.value.future.length,
})

beforeEach(() => load({ Box: new BoxGeometry() }))

/** One stroke: its writes, kept as one step. */
function stroke(vertices: number[], id = 0) {
  doc.begin({ stroke: true }).paint(vertices, id)
  doc.commit()
}

describe('history', () => {
  test('undo and redo restore labels and counts', () => {
    stroke([0, 1, 2])
    stroke([3])
    expect(count(0)).toBe(4)
    doc.undo()
    expect(labeled()).toBe(3)
    expect(count(0)).toBe(3)
    expect(steps()).toEqual({ past: 1, future: 1 })
    doc.redo()
    expect(labeled()).toBe(4)
    expect(steps()).toEqual({ past: 2, future: 0 })
  })

  test('a new edit clears the redo stack', () => {
    stroke([0])
    doc.undo()
    stroke([1])
    expect(steps().future).toBe(0)
  })

  test('abort drops a transaction without a trace', () => {
    stroke([0])
    doc.begin({ stroke: true }).paint([1, 2], 0)
    doc.abort()
    expect(labeled()).toBe(1)
    expect(steps()).toEqual({ past: 1, future: 0 })
  })

  test('an edit that throws leaves no trace', () => {
    expect(() =>
      doc.transact((tx) => {
        tx.paint([0, 1], 0)
        throw new Error('halfway')
      }),
    ).toThrow('halfway')
    expect(labeled()).toBe(0)
    expect(steps().past).toBe(0)
  })

  test('a transaction that changes nothing is no step', () => {
    doc.transact((tx) => tx.paint([0], -1))
    expect(steps().past).toBe(0)
  })

  test('a step holds only what changed', () => {
    stroke([0, 1, 2])
    const [step] = doc.history.value.past
    expect([...step.indices]).toEqual([0, 1, 2])
    expect([...step.before]).toEqual([-1, -1, -1])
  })

  test('visibility is not an edit, so undo leaves it alone', () => {
    doc.transact((tx) => {
      tx.paint([0], 0)
      doc.addClass()
    })
    doc.classes.value = doc.classes.value.map((c) => ({
      ...c,
      hidden: c.id === 0,
    }))
    doc.undo()
    expect(doc.classes.value).toHaveLength(doc.CLASSES.length)
    expect(doc.classes.value[0].hidden).toBe(true)
  })

  test('keeps the last 50 steps', () => {
    for (let i = 0; i < 60; i++) stroke([0], i % 2)
    expect(steps().past).toBe(50)
  })
})

describe('transactions', () => {
  test('only one is open at a time', () => {
    doc.begin()
    expect(() => doc.begin()).toThrow()
    doc.abort()
  })

  test('one that has ended can no longer write', () => {
    const tx = doc.begin()
    doc.commit()
    expect(() => tx.paint([0], 0)).toThrow()
    expect(() => tx.fill(0)).toThrow()
    expect(labeled()).toBe(0)
  })

  test('a stroke settles once, when it ends', () => {
    const before = doc.labels.version.value
    const tx = doc.begin({ stroke: true })
    tx.paint([0], 0)
    tx.paint([1], 0)
    expect(doc.labels.version.value).toBe(before)
    doc.commit()
    expect(doc.labels.version.value).toBe(before + 1)
  })

  test('each write tells its listeners what it touched', () => {
    const heard: unknown[] = []
    const stop = doc.labels.onWrite((elements) => heard.push(elements))
    const tx = doc.begin({ stroke: true })
    tx.paint([4, 5], 0)
    tx.fill(1)
    stop()
    tx.paint([6], 0)
    doc.abort()
    expect(heard).toEqual([[4, 5], null])
  })
})

describe('classes', () => {
  test('labeling without an active class creates one', () => {
    doc.classes.value = []
    doc.activeId.value = -1
    const id = doc.targetClass()
    expect(doc.classes.value.map((c) => c.id)).toEqual([id])
    expect(doc.activeId.value).toBe(id)
  })

  test('new classes take the next id and palette color', () => {
    doc.addClass()
    const added = doc.classes.value.at(-1)!
    expect(added.id).toBe(doc.CLASSES.length)
    expect(added.color).toMatch(/^#[0-9a-f]{6}$/)
    expect(added.color).not.toBe(doc.CLASSES.at(-1)!.color)
  })
})
