import { BufferAttribute, BufferGeometry, Color, type Material } from 'three'

import type { Part } from '../common'
import { computed, doc, signal } from '../core'
import { PREVIEW } from './materials'

/** The model's file name, and a count of models opened, so a reopened file counts as new. */
export const name = signal('')
export const opened = signal(0)
export const parts = signal<Part[]>([])
/** Bumps when what's drawn (and so pickable) changes. */
export const drawn = signal(0)

export const data = {
  /**
   * What's drawn solid, and so pickable. `xray` (labels X-ray has made
   * see-through), `outline` (one part's silhouette) and `preview` (Fill's
   * region) share its attributes.
   */
  geometry: null as BufferGeometry | null,
  xray: new BufferGeometry(),
  outline: new BufferGeometry(),
  preview: new BufferGeometry(),
  /** Every triangle, as loaded; `refresh` filters it into the two above. */
  triangles: new Uint32Array(0),
  /** Per vertex: 1 when its part is shown, solid or see-through. */
  visible: new Uint8Array(0),
  /** Per vertex: 1 when it's drawn solid, so it can be painted and selected. */
  solid: new Uint8Array(0),
  /** One textured material per part, matching the geometry's groups. */
  materials: [] as Material[],
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
 * Per vertex, 1 when it's drawn solid. Reading `drawn` makes an effect that
 * calls this re-run when what's solid changes; the array itself can't tell it.
 */
export function pickable() {
  void drawn.value
  return data.solid
}

/**
 * Splits triangles into solid and see-through: hidden parts vanish, and with
 * `xray` any triangle touching a label turns see-through, except labels that
 * differ from `base` (a selection still being refined). Everything that picks
 * (brush, Smart Select, depth pass) only sees what's drawn.
 * Returns whether the drawn set changed size, i.e. the view needs a recapture.
 */
export function refresh(xray: boolean, base: ArrayLike<number> | null = null) {
  const { geometry, xray: faint, triangles, visible, solid } = data
  const all = doc.labels.peek()
  const list = parts.peek()
  if (!geometry) return false
  visible.fill(0)
  solid.fill(0)
  for (const p of list)
    if (!p.hidden)
      for (let v = p.start; v < p.start + p.count; v++) {
        visible[v] = 1
        solid[v] = +(
          !xray ||
          all[v] === -1 ||
          (base !== null && base[v] !== all[v])
        )
      }

  const drawn = geometry.index!.array as Uint32Array
  const seeThrough = faint.index!.array as Uint32Array
  const before = geometry.drawRange.count
  let s = 0
  let f = 0
  let t = 0
  geometry.clearGroups()
  list.forEach((part, i) => {
    const start = s
    const end = t + part.faces
    for (; !part.hidden && t < end; t += 3) {
      const [a, b, c] = [triangles[t], triangles[t + 1], triangles[t + 2]]
      const out = solid[a] && solid[b] && solid[c] ? drawn : seeThrough
      const at = out === drawn ? (s += 3) - 3 : (f += 3) - 3
      out[at] = a
      out[at + 1] = b
      out[at + 2] = c
    }
    t = end
    geometry.addGroup(start, s - start, i)
  })
  geometry.setDrawRange(0, s)
  faint.setDrawRange(0, f)
  geometry.index!.needsUpdate = faint.index!.needsUpdate = true
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
  const part = parts.peek()[index]
  const first = parts
    .peek()
    .slice(0, Math.max(index, 0))
    .reduce((sum, p) => sum + p.faces, 0)
  data.outline.setDrawRange(first, part && !part.hidden ? part.faces : 0)
}

/**
 * Writes label colors (all of them, or just `batches` of vertices, e.g. a
 * stroke's); unlabeled vertices and hidden classes are transparent.
 */
export function colorize(
  classes: doc.Cls[],
  batches: ArrayLike<number>[] | null = null,
) {
  const attr = data.geometry?.getAttribute('color') as BufferAttribute
  if (!attr) return
  const bytes = (hex: string) =>
    new Color(hex).toArray().map((x) => Math.round(x * 255))
  const colors = new Map(
    classes.filter((c) => !c.hidden).map((c) => [c.id, bytes(c.color)]),
  )
  const all = doc.labels.peek()
  const out = attr.array as Uint8Array
  const write = (v: number) => {
    const c = colors.get(all[v])
    if (c) out.set(c, v * 4)
    out[v * 4 + 3] = c ? 255 : 0
  }
  if (batches)
    for (const batch of batches)
      for (let i = 0; i < batch.length; i++) write(batch[i])
  else for (let v = 0; v < all.length; v++) write(v)
  attr.needsUpdate = true
}

/**
 * Vertices per class, and each part's class: the one covering over half of
 * it, -1 when none does.
 */
export const tally = computed(() => {
  const all = doc.labels.settled
  const counts = new Map<number, number>()
  const classOf = parts.value.map((part) => {
    const own = new Map<number, number>()
    for (let v = part.start; v < part.start + part.count; v++)
      own.set(all[v], (own.get(all[v]) ?? 0) + 1)
    let cls = -1
    for (const [id, n] of own) {
      counts.set(id, (counts.get(id) ?? 0) + n)
      if (id !== -1 && n > part.count / 2) cls = id
    }
    return cls
  })
  return { counts, classOf }
})
