import { BoxGeometry, SphereGeometry } from 'three'
import { describe, expect, test } from 'vitest'

import { data } from '../../lib/mesh'
import { flood, folds } from '../../lib/topology'
import { grid, load } from './fixtures'

const everywhere = () => true
const x = (v: number) => data.geometry!.getAttribute('position').getX(v)
/** X before scaling into the unit sphere, as the grid was built. */
const original = (v: number) => x(v) * data.scale + data.center[0]

describe('flood', () => {
  test('stays within a connected piece', async () => {
    await load({
      A: new BoxGeometry(1, 1, 1).translate(-1, 0, 0),
      B: new BoxGeometry(1, 1, 1).translate(1, 0, 0),
    })
    const reached = flood(0, everywhere)
    expect(reached.length).toBe(data.parts[0].count)
  })

  // Box faces don't share vertices (each has its own normals), yet it's one surface.
  test('crosses seams where vertices only share a position', async () => {
    const box = new BoxGeometry(1, 1, 1)
    box.deleteAttribute('uv')
    await load({ Box: box })
    expect(new Set(flood(0, everywhere)).size).toBe(data.labels.length)
  })

  test('takes a wall but does not spread past it', async () => {
    await load({ Plane: grid(10, () => 0) })
    const wall = (v: number) => Math.abs(x(v)) < 0.01
    const left = (v: number) => x(v) < 0
    const reached = flood(0, everywhere, wall)
    expect(reached.some((v) => wall(v))).toBe(true)
    expect(reached.every((v) => left(v) || wall(v))).toBe(true)
  })
})

describe('folds', () => {
  test('find a sharp groove', async () => {
    // A V-groove down the middle of a plane: where two parts would meet.
    await load({
      Plane: grid(40, (x) => -0.4 * Math.max(0, 1 - Math.abs(x) / 0.1)),
    })
    const fold = folds(10)
    const groove = [...data.labels.keys()].filter((v) => Math.abs(x(v)) < 0.03)
    const flat = [...data.labels.keys()].filter((v) => Math.abs(x(v)) > 0.3)
    expect(groove.every(fold)).toBe(true)
    expect(flat.some(fold)).toBe(false)
  })

  test('a smooth sphere has none, however sensitive', async () => {
    await load({ Ball: new SphereGeometry(1, 48, 32) })
    const fold = folds(100)
    expect([...data.labels.keys()].some(fold)).toBe(false)
  })

  test('a ridge folds at its feet, not its crest', async () => {
    await load({
      Plane: grid(40, (x) => 0.4 * Math.max(0, 1 - Math.abs(x) / 0.4)),
    })
    const fold = folds(10)
    const keys = [...data.labels.keys()]
    const crest = keys.filter((v) => Math.abs(original(v)) < 0.01)
    const feet = keys.filter(
      (v) => Math.abs(Math.abs(original(v)) - 0.4) < 0.01,
    )
    expect(crest.some(fold)).toBe(false)
    expect(feet.length).toBeGreaterThan(0)
    expect(feet.every(fold)).toBe(true)
  })
})
