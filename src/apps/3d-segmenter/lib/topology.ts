import type { BufferGeometry } from 'three'

import { data } from './mesh'

type Topology = {
  /** Vertex neighbors in CSR form: the neighbors of `v` are `links[offsets[v]..offsets[v + 1]]`. */
  offsets: Int32Array
  links: Int32Array
  /** How sharply the surface folds inward at each vertex; 0 on flat or convex surface. */
  valley: Float32Array
  /** The valley values, sorted, to turn a sensitivity into a threshold. */
  sorted: Float32Array
}

let cache: { geometry: BufferGeometry; topology: Topology } | undefined

/**
 * Built on first use and kept until the geometry changes. Vertices at the same
 * position (split normals, UV seams, STL facets) count as one, so the surface
 * holds together however it was exported.
 */
function topology() {
  const geometry = data.geometry!
  if (cache?.geometry === geometry) return cache.topology

  const { triangles } = data
  const position = geometry.getAttribute('position').array
  const n = data.labels.length
  const twin = weld(position)
  const edges = (visit: (a: number, b: number) => void) => {
    for (let t = 0; t < triangles.length; t += 3) {
      visit(triangles[t], triangles[t + 1])
      visit(triangles[t + 1], triangles[t + 2])
      visit(triangles[t + 2], triangles[t])
    }
    for (let v = 0; v < n; v++) if (twin[v] !== v) visit(v, twin[v])
  }

  const offsets = new Int32Array(n + 1)
  edges((a, b) => {
    offsets[a + 1]++
    offsets[b + 1]++
  })
  for (let v = 0; v < n; v++) offsets[v + 1] += offsets[v]
  const links = new Int32Array(offsets[n])
  const cursor = offsets.slice(0, n)
  edges((a, b) => {
    links[cursor[a]++] = b
    links[cursor[b]++] = a
  })

  const valley = fold(triangles, position, twin, offsets, links)
  const sorted = valley.slice().sort()
  cache = { geometry, topology: { offsets, links, valley, sorted } }
  return cache.topology
}

/** Each vertex's twin: the first vertex at the same position, to 1e-4 of the model's radius. */
function weld(position: ArrayLike<number>) {
  const first = new Map<number, number>()
  const twin = new Int32Array(position.length / 3)
  // The model is scaled into the unit sphere, so each quantized axis fits in 15 bits.
  const q = (i: number) => Math.round(position[i] * 1e4) + 16384
  for (let v = 0; v < twin.length; v++) {
    const key = (q(v * 3) * 32768 + q(v * 3 + 1)) * 32768 + q(v * 3 + 2)
    twin[v] = first.get(key) ?? (first.set(key, v), v)
  }
  return twin
}

/**
 * Concave curvature per vertex: where parts meet, by the minima rule (between
 * teeth, around a knuckle). Measured on smooth normals of the welded surface,
 * so it doesn't depend on how the file's normals were exported, then smoothed
 * twice so scan noise doesn't read as a fold.
 */
function fold(
  triangles: Uint32Array,
  p: ArrayLike<number>,
  twin: Int32Array,
  offsets: Int32Array,
  links: Int32Array,
) {
  const n = twin.length
  const normal = new Float32Array(n * 3)
  const sub = (a: number, b: number) => [
    p[b * 3] - p[a * 3],
    p[b * 3 + 1] - p[a * 3 + 1],
    p[b * 3 + 2] - p[a * 3 + 2],
  ]
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t]
    const [ux, uy, uz] = sub(a, triangles[t + 1])
    const [vx, vy, vz] = sub(a, triangles[t + 2])
    // Unnormalized, so bigger triangles weigh more.
    const face = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 3; k++)
        normal[twin[triangles[t + i]] * 3 + k] += face[k]
  }

  // Along an edge d, curvature is 2(n·d)/|d|²: positive when the neighbor
  // rises above the tangent plane, i.e. the surface folds inward. A fold runs
  // one way, so take the sharpest direction rather than the average.
  const sharpest = new Float32Array(n)
  for (let v = 0; v < n; v++) {
    const w = twin[v]
    const [nx, ny, nz] = [normal[w * 3], normal[w * 3 + 1], normal[w * 3 + 2]]
    const length = Math.hypot(nx, ny, nz) || 1
    for (let k = offsets[v]; k < offsets[v + 1]; k++) {
      const [dx, dy, dz] = sub(v, links[k])
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 < 1e-12) continue
      const k2 = (2 * (nx * dx + ny * dy + nz * dz)) / length / d2
      if (k2 > sharpest[w]) sharpest[w] = k2
    }
  }

  let valley = new Float32Array(n)
  for (let v = 0; v < n; v++) valley[v] = sharpest[twin[v]]
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(n)
    for (let v = 0; v < n; v++) {
      let total = valley[v]
      for (let k = offsets[v]; k < offsets[v + 1]; k++)
        total += valley[links[k]]
      next[v] = total / (offsets[v + 1] - offsets[v] + 1)
    }
    valley = next
  }
  return valley
}

/**
 * Bends gentler than this curvature are never folds, however high the
 * sensitivity: the model fits in a unit sphere, so this is a bend wider than a
 * quarter of the model, and anything below it is shape or scan noise.
 */
const GENTLE = 4

/**
 * Which vertices count as folds: the most sharply folded `sensitivity`
 * percent of the surface, plus their neighbors. Relative, so it means the same
 * on any model's scale and noise; thickened, so a fill can't slip through a
 * one-vertex-wide fold along a triangle's diagonal.
 */
export function folds(sensitivity: number) {
  const { valley, sorted, offsets, links } = topology()
  const index = Math.floor((1 - sensitivity / 100) * (sorted.length - 1))
  const threshold = Math.max(sorted[Math.max(0, index)], GENTLE)
  return (v: number) => {
    if (valley[v] >= threshold) return true
    for (let k = offsets[v]; k < offsets[v + 1]; k++)
      if (valley[links[k]] >= threshold) return true
    return false
  }
}

/**
 * Vertices connected to `seed` through vertices that pass `enter`. A `wall`
 * vertex is taken but not spread from, so a fill reaches into a fold without
 * crossing it, and two neighboring fills leave no gap.
 */
export function flood(
  seed: number,
  enter: (v: number) => boolean,
  wall: (v: number) => boolean = () => false,
) {
  const { offsets, links } = topology()
  const seen = new Uint8Array(data.labels.length)
  const out = [seed]
  seen[seed] = 1
  for (let i = 0; i < out.length; i++) {
    const a = out[i]
    if (i > 0 && wall(a)) continue
    for (let k = offsets[a]; k < offsets[a + 1]; k++) {
      const b = links[k]
      if (seen[b] || !enter(b)) continue
      seen[b] = 1
      out.push(b)
    }
  }
  return out
}
