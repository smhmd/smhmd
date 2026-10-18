import { BoxGeometry, Color, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { beforeEach, describe, expect, test } from 'vitest'

import { CLASSES } from '../../lib/common'
import { colorize, data, refresh, tally } from '../../lib/mesh'
import { load } from './fixtures'

const parts = () => ({
  Left_box: new BoxGeometry(1, 1, 1).translate(-2, 0, 0),
  Ball: new SphereGeometry(0.5, 12, 8).translate(2, 0, 0),
})

beforeEach(() => load(parts()))

describe('parse', () => {
  test('merges every mesh into one geometry, a part each', () => {
    expect(data.parts.map((p) => p.name)).toEqual(['Left box', 'Ball'])
    const [box, ball] = data.parts
    expect(ball.start).toBe(box.count)
    expect(box.count + ball.count).toBe(data.labels.length)
    expect(box.faces + ball.faces).toBe(data.triangles.length)
    expect(data.labels.every((l) => l === -1)).toBe(true)
  })

  test('a single mesh lists its separate pieces, biggest first', async () => {
    const { Left_box, Ball } = parts()
    await load({ Scan: mergeGeometries([Left_box, Ball]) })
    // The box's faces don't share vertices, but they touch: one piece.
    expect(data.parts.map((p) => p.name)).toEqual(['Piece 1', 'Piece 2'])
    expect(data.parts[0].count).toBeGreaterThan(data.parts[1].count)
    expect(data.materials).toHaveLength(2)
  })

  test('scales the model into the unit sphere', () => {
    expect(data.geometry!.boundingSphere!.radius).toBeCloseTo(1, 5)
  })
})

describe('refresh', () => {
  const drawn = () => data.geometry!.drawRange.count
  const ghosted = () => data.ghost.drawRange.count

  test('draws everything by default', () => {
    refresh(false)
    expect(drawn()).toBe(data.triangles.length)
    expect(data.shown.every((s) => s === 1)).toBe(true)
  })

  test('a hidden part is neither drawn nor pickable', () => {
    data.parts[0].hidden = true
    expect(refresh(false)).toBe(true)
    expect(drawn()).toBe(data.parts[1].faces)
    expect(data.shown[0]).toBe(0)
    expect(data.present[0]).toBe(0)
    expect(ghosted()).toBe(0)
  })

  test('X-ray ghosts labeled triangles', () => {
    const { count, faces } = data.parts[0]
    data.labels.fill(0, 0, count)
    refresh(true)
    expect(drawn()).toBe(data.parts[1].faces)
    expect(ghosted()).toBe(faces)
    expect(data.shown[0]).toBe(0)
    // Still there for a tool that reaches ghosts.
    expect(data.present[0]).toBe(1)
  })

  test('X-ray keeps a live selection solid until it is applied', () => {
    data.base = data.labels.slice()
    data.labels.fill(0, 0, data.parts[0].count)
    refresh(true)
    expect(drawn()).toBe(data.triangles.length)
    data.base = null
    refresh(true)
    expect(drawn()).toBe(data.parts[1].faces)
  })
})

describe('tally', () => {
  test('counts vertices per class and tags parts by majority', () => {
    const [box, ball] = data.parts
    data.labels.fill(1, 0, box.count)
    data.labels.fill(2, ball.start, ball.start + 3)
    const classes = tally(CLASSES)
    expect(classes.find((c) => c.id === 1)!.count).toBe(box.count)
    expect(classes.find((c) => c.id === 2)!.count).toBe(3)
    expect(data.parts.map((p) => p.cls)).toEqual([1, -1])
  })

  test('keeps unchanged classes and parts identical, so rows skip renders', () => {
    const classes = tally(CLASSES)
    const parts = data.parts
    data.labels[parts[1].start] = 3
    const next = tally(classes)
    expect(next[0]).toBe(classes[0])
    expect(next[3]).not.toBe(classes[3])
    expect(data.parts[0]).toBe(parts[0])
  })
})

describe('colorize', () => {
  const rgba = (v: number) =>
    Array.from(
      (data.geometry!.getAttribute('color').array as Uint8Array).slice(
        v * 4,
        v * 4 + 4,
      ),
    )

  test('labels are opaque class colors, the rest transparent', () => {
    data.labels[0] = 0
    colorize(CLASSES)
    // Vertex colors are linear, like everything three.js shades.
    const linear = new Color(CLASSES[0].color).toArray()
    expect(rgba(0)).toEqual([...linear.map((c) => Math.round(c * 255)), 255])
    expect(rgba(1)[3]).toBe(0)
  })

  test('a hidden class is transparent', () => {
    data.labels[0] = 0
    colorize(CLASSES.map((c) => ({ ...c, hidden: c.id === 0 })))
    expect(rgba(0)[3]).toBe(0)
  })

  test('only touches the vertices it is given', () => {
    data.labels[0] = data.labels[1] = 0
    colorize(CLASSES, [0])
    expect(rgba(0)[3]).toBe(255)
    expect(rgba(1)[3]).toBe(0)
  })
})
