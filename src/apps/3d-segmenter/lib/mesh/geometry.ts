import { BufferAttribute, BufferGeometry, Color, type Material } from 'three'

import type { Cls, Part } from '../common'
import { PREVIEW } from './materials'

export const data = {
  /**
   * What's drawn and pickable. `ghost` (X-rayed labels), `outline` (one
   * part's silhouette) and `preview` (Fill's region) share its attributes.
   */
  geometry: null as BufferGeometry | null,
  ghost: new BufferGeometry(),
  outline: new BufferGeometry(),
  preview: new BufferGeometry(),
  /** Every triangle, as loaded; `refresh` filters it into the two above. */
  triangles: new Uint32Array(0),
  /** Per vertex: 1 when it can be seen, painted and selected. */
  shown: new Uint8Array(0),
  /** One textured material per part, matching the geometry's groups. */
  materials: [] as Material[],
  parts: [] as Part[],
  /** Class id per vertex, -1 when unlabeled. */
  labels: new Int32Array(0),
  /** The labels before the live Smart Select selection; null when there's none. */
  base: null as Int32Array | null,
  center: [0, 0, 0],
  scale: 1,
  /** What the file held, for the Model section. `size` is in the file's own units. */
  info: {
    format: '',
    bytes: 0,
    size: [0, 0, 0],
    materials: 0,
    textures: 0,
  },
}

/**
 * Splits triangles into drawn and ghosted: hidden parts vanish, and with
 * `xray` any triangle touching a label moves to the ghost, except labels that
 * differ from `base` (a selection still being refined). Everything that picks
 * (brush, Smart Select, depth pass) only sees what's drawn.
 * Returns whether the drawn set changed size, i.e. the view needs a recapture.
 */
export function refresh(xray: boolean) {
  const { geometry, ghost, triangles, labels, parts, shown, base } = data
  if (!geometry) return false
  shown.fill(0)
  for (const p of parts)
    if (!p.hidden)
      for (let v = p.start; v < p.start + p.count; v++)
        shown[v] = +(
          !xray ||
          labels[v] === -1 ||
          (base !== null && base[v] !== labels[v])
        )

  const solid = geometry.index!.array as Uint32Array
  const faint = ghost.index!.array as Uint32Array
  const before = geometry.drawRange.count
  let s = 0
  let f = 0
  let t = 0
  geometry.clearGroups()
  parts.forEach((part, i) => {
    const start = s
    const end = t + part.faces
    for (; !part.hidden && t < end; t += 3) {
      const [a, b, c] = [triangles[t], triangles[t + 1], triangles[t + 2]]
      const out = shown[a] && shown[b] && shown[c] ? solid : faint
      const at = out === solid ? (s += 3) - 3 : (f += 3) - 3
      out[at] = a
      out[at + 1] = b
      out[at + 2] = c
    }
    t = end
    geometry.addGroup(start, s - start, i)
  })
  geometry.setDrawRange(0, s)
  ghost.setDrawRange(0, f)
  geometry.index!.needsUpdate = ghost.index!.needsUpdate = true
  return s !== before
}

/** Tints the triangles whose vertices are all marked in `region`; null clears it. */
export function highlight(region: Uint8Array | null, color?: string) {
  const { preview, triangles } = data
  const out = preview.index!.array as Uint32Array
  let n = 0
  if (region)
    for (let t = 0; t < triangles.length; t += 3)
      if (
        region[triangles[t]] &&
        region[triangles[t + 1]] &&
        region[triangles[t + 2]]
      ) {
        out.set(triangles.subarray(t, t + 3), n)
        n += 3
      }
  if (color) PREVIEW.color.set(color)
  preview.setDrawRange(0, n)
  preview.index!.needsUpdate = true
}

/** Outlines a part (-1 for none) by drawing only its triangles. */
export function outline(index: number) {
  const part = data.parts[index]
  const first = data.parts
    .slice(0, Math.max(index, 0))
    .reduce((sum, p) => sum + p.faces, 0)
  data.outline.setDrawRange(first, part && !part.hidden ? part.faces : 0)
}

/**
 * Writes label colors (all of them, or just `vertices`, e.g. a stroke's);
 * unlabeled vertices and hidden classes are transparent.
 */
export function colorize(classes: Cls[], vertices?: Iterable<number>) {
  const attr = data.geometry?.getAttribute('color') as BufferAttribute
  if (!attr) return
  const bytes = (hex: string) =>
    new Color(hex).toArray().map((x) => Math.round(x * 255))
  const colors = new Map(
    classes.filter((c) => !c.hidden).map((c) => [c.id, bytes(c.color)]),
  )
  const { labels } = data
  const out = attr.array as Uint8Array
  const write = (v: number) => {
    const c = colors.get(labels[v])
    if (c) out.set(c, v * 4)
    out[v * 4 + 3] = c ? 255 : 0
  }
  if (vertices) for (const v of vertices) write(v)
  else for (let v = 0; v < labels.length; v++) write(v)
  attr.needsUpdate = true
}

/** The same array when nothing in it changed, so subscribers skip a render. */
const keep = <T>(prev: T[], next: T[]) =>
  next.length === prev.length && next.every((x, i) => x === prev[i])
    ? prev
    : next

/**
 * Counts vertices per class, and tags each part with the class covering over
 * half of it. Unchanged classes and parts keep their identity.
 */
export function tally(classes: Cls[]) {
  const totals = new Map<number, number>()
  data.parts = keep(
    data.parts,
    data.parts.map((part) => {
      const counts = new Map<number, number>()
      for (let v = part.start; v < part.start + part.count; v++)
        counts.set(data.labels[v], (counts.get(data.labels[v]) ?? 0) + 1)
      let cls = -1
      for (const [id, n] of counts) {
        totals.set(id, (totals.get(id) ?? 0) + n)
        if (id !== -1 && n > part.count / 2) cls = id
      }
      return cls === part.cls ? part : { ...part, cls }
    }),
  )
  return keep(
    classes,
    classes.map((c) => {
      const count = totals.get(c.id) ?? 0
      return count === c.count ? c : { ...c, count }
    }),
  )
}
