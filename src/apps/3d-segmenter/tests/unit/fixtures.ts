import {
  BufferGeometry,
  Float32BufferAttribute,
  PerspectiveCamera,
} from 'three'

import { data, parse } from '../../lib/mesh'
import { view } from '../../lib/view'

/** Writes geometries as one OBJ, a named object each, so they load through the real `parse`. */
function obj(parts: Record<string, BufferGeometry>) {
  const lines: string[] = []
  let offset = 1
  for (const [name, geometry] of Object.entries(parts)) {
    lines.push(`o ${name}`)
    const p = geometry.getAttribute('position')
    for (let v = 0; v < p.count; v++)
      lines.push(`v ${p.getX(v)} ${p.getY(v)} ${p.getZ(v)}`)
    const index = geometry.index?.array ?? [...Array(p.count).keys()]
    for (let t = 0; t < index.length; t += 3)
      lines.push(
        `f ${index[t] + offset} ${index[t + 1] + offset} ${index[t + 2] + offset}`,
      )
    offset += p.count
  }
  return new TextEncoder().encode(lines.join('\n')).buffer
}

export const load = (parts: Record<string, BufferGeometry>) =>
  parse('test.obj', obj(parts))

/**
 * A square grid in the XY plane, facing +Z, with `height(x, y)` as its Z:
 * the easiest way to sculpt folds.
 */
export function grid(n: number, height: (x: number, y: number) => number) {
  const positions: number[] = []
  const index: number[] = []
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const [x, y] = [(i / n) * 2 - 1, (j / n) * 2 - 1]
      positions.push(x, y, height(x, y))
    }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i
      const [b, c, d] = [a + 1, a + n + 1, a + n + 2]
      index.push(a, b, d, a, d, c)
    }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(index)
  return geometry
}

/**
 * Stands in for a capture: a camera on +Z, every drawn vertex visible, and
 * screen = 500 + 400 × (x, -y) in the loaded (unit-sphere) space.
 */
export function look() {
  const camera = new PerspectiveCamera(35, 1, 0.05, 20)
  camera.position.set(0, 0, 3)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  const position = data.geometry!.getAttribute('position')
  const screen = new Float32Array(position.count * 2)
  for (let v = 0; v < position.count; v++) {
    screen[v * 2] = 500 + 400 * position.getX(v)
    screen[v * 2 + 1] = 500 - 400 * position.getY(v)
  }
  Object.assign(view, {
    camera,
    width: 1000,
    height: 1000,
    screen,
    visible: data.shown.slice(),
    dirty: false,
  })
}

/** Where a loaded vertex lands on the stand-in screen. */
export const at = (x: number, y: number) =>
  [500 + 400 * x, 500 - 400 * y] as const

export const labeled = (id?: number) =>
  data.labels.filter((l) => (id === undefined ? l >= 0 : l === id)).length
