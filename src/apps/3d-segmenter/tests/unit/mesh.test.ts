import { BoxGeometry, Color, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { beforeEach, describe, expect, test } from 'vitest'

import { doc } from '../../lib/core'
import * as mesh from '../../lib/mesh'
import { load } from './fixtures'

/** Writes labels the way any edit does: in a transaction. */
const label = (id: number, start: number, end: number) =>
  doc.transact((tx) => tx.fill(id, start, end))
const hide = (index: number) =>
  (mesh.parts.value = mesh.parts.value.map((p, i) =>
    i === index ? { ...p, hidden: true } : p,
  ))

const parts = () => ({
  Left_box: new BoxGeometry(1, 1, 1).translate(-2, 0, 0),
  Ball: new SphereGeometry(0.5, 12, 8).translate(2, 0, 0),
})

beforeEach(() => load(parts()))

describe('parse', () => {
  test('merges every mesh into one geometry, a part each', () => {
    expect(mesh.parts.value.map((p) => p.name)).toEqual(['Left box', 'Ball'])
    const [box, ball] = mesh.parts.value
    expect(ball.start).toBe(box.count)
    expect(box.count + ball.count).toBe(doc.labels.peek().length)
    expect(box.faces + ball.faces).toBe(mesh.data.triangles.length)
    expect(doc.labels.peek().every((l) => l === -1)).toBe(true)
  })

  test('a single mesh lists its separate pieces, biggest first', async () => {
    const { Left_box, Ball } = parts()
    await load({ Scan: mergeGeometries([Left_box, Ball]) })
    // The box's faces don't share vertices, but they touch: one piece.
    expect(mesh.parts.value.map((p) => p.name)).toEqual(['Piece 1', 'Piece 2'])
    expect(mesh.parts.value[0].count).toBeGreaterThan(mesh.parts.value[1].count)
    expect(mesh.data.materials).toHaveLength(2)
  })

  test('scales the model into the unit sphere', () => {
    expect(mesh.data.geometry!.boundingSphere!.radius).toBeCloseTo(1, 5)
  })
})

describe('refresh', () => {
  const drawn = () => mesh.data.geometry!.drawRange.count
  const seeThrough = () => mesh.data.xray.drawRange.count

  test('draws everything by default', () => {
    mesh.refresh(false)
    expect(drawn()).toBe(mesh.data.triangles.length)
    expect(mesh.data.solid.every((s) => s === 1)).toBe(true)
  })

  test('a hidden part is neither drawn nor pickable', () => {
    mesh.refresh(false)
    hide(0)
    expect(mesh.refresh(false)).toBe(true)
    expect(drawn()).toBe(mesh.parts.value[1].faces)
    expect(mesh.data.solid[0]).toBe(0)
    expect(mesh.data.visible[0]).toBe(0)
    expect(seeThrough()).toBe(0)
  })

  test('X-ray makes labeled triangles see-through', () => {
    const { count, faces } = mesh.parts.value[0]
    label(0, 0, count)
    mesh.refresh(true)
    expect(drawn()).toBe(mesh.parts.value[1].faces)
    expect(seeThrough()).toBe(faces)
    expect(mesh.data.solid[0]).toBe(0)
    // Still there for a tool that ignores X-ray.
    expect(mesh.data.visible[0]).toBe(1)
  })

  test('X-ray keeps a live selection solid until it is applied', () => {
    const base = doc.labels.peek().slice()
    label(0, 0, mesh.parts.value[0].count)
    mesh.refresh(true, base)
    expect(drawn()).toBe(mesh.data.triangles.length)
    mesh.refresh(true)
    expect(drawn()).toBe(mesh.parts.value[1].faces)
  })
})

describe('tally', () => {
  test('counts vertices per class and tags parts by majority', () => {
    const [box, ball] = mesh.parts.value
    label(1, 0, box.count)
    label(2, ball.start, ball.start + 3)
    const { counts, classOf } = mesh.tally.value
    expect(counts.get(1)).toBe(box.count)
    expect(counts.get(2)).toBe(3)
    expect(classOf).toEqual([1, -1])
  })

  test('follows every edit', () => {
    label(1, 0, 5)
    expect(mesh.tally.value.counts.get(1)).toBe(5)
    label(1, 5, 7)
    expect(mesh.tally.value.counts.get(1)).toBe(7)
  })
})

describe('colorize', () => {
  const rgba = (v: number) =>
    Array.from(
      (mesh.data.geometry!.getAttribute('color').array as Uint8Array).slice(
        v * 4,
        v * 4 + 4,
      ),
    )

  test('labels are opaque class colors, the rest transparent', () => {
    label(0, 0, 1)
    mesh.colorize(doc.CLASSES)
    // Vertex colors are linear, like everything three.js shades.
    const linear = new Color(doc.CLASSES[0].color).toArray()
    expect(rgba(0)).toEqual([...linear.map((c) => Math.round(c * 255)), 255])
    expect(rgba(1)[3]).toBe(0)
  })

  test('a hidden class is transparent', () => {
    label(0, 0, 1)
    mesh.colorize(doc.CLASSES.map((c) => ({ ...c, hidden: c.id === 0 })))
    expect(rgba(0)[3]).toBe(0)
  })

  test('only touches the vertices it is given', () => {
    mesh.colorize(doc.CLASSES)
    label(0, 0, 2)
    mesh.colorize(doc.CLASSES, [[0]])
    expect(rgba(0)[3]).toBe(255)
    expect(rgba(1)[3]).toBe(0)
  })
})
