import { Vector3 } from 'three'

import type { Behavior } from '../common'
import { active, discard, paint, recount, snapshot, target } from '../edit'
import { data, highlight } from '../mesh'
import { doc, ui } from '../state'
import { flood, folds } from '../topology'
import { pixel, under, view } from '../view'

/** Fill stops at the most sharply folded 10% of the surface: tooth gaps, gum lines, joints. */
const FOLDS = 10

/** Where a dab lands: the triangle under the pointer, and its corner nearest it. */
type Hit = NonNullable<ReturnType<typeof under>>

/**
 * The dab previewed under the pointer: the triangle it grows from, how far (in
 * screen pixels, like the brush ring; Infinity for the whole piece), and the
 * vertices it takes.
 */
let preview: { face: number[]; radius: number; region: Uint8Array } | null =
  null
/** The triangle the last dab grew from, so holding still doesn't redo it. */
let dab: number[] = []

const same = (a: number[], b: number[]) => a.every((v, i) => v === b[i])
/** Where a stroke started, up to folds: dragging stays on that part, like the first dab. */
let zone: Uint8Array | null = null

/** Held Shift takes the whole connected piece, folds and all. */
const reach = () => (view.shift ? Infinity : ui.get().radius)

/**
 * The surface Fill takes from the triangle under the pointer: connected,
 * within `radius` pixels of its nearest corner (as a distance in 3D at its
 * depth), through unlabeled vertices, that corner's label and the active
 * class, up to folds (other than one it starts in) and inside `within`. The
 * triangle itself is always in, however big. An infinite radius without walls
 * is the whole piece.
 */
function area(
  { face, seed }: Hit,
  radius: number,
  walls = radius !== Infinity,
  within?: Uint8Array,
) {
  const { labels, shown } = data
  const from = labels[seed]
  const id = doc.get().active
  const position = data.geometry!.getAttribute('position')
  const center = new Vector3().fromBufferAttribute(position, seed)
  const point = new Vector3()
  const far = radius === Infinity
  const r2 = far ? Infinity : (radius * pixel(center)) ** 2
  const enter = (v: number) =>
    shown[v] === 1 &&
    (labels[v] === -1 || labels[v] === from || labels[v] === id) &&
    (!within || within[v] === 1) &&
    (far ||
      point.fromBufferAttribute(position, v).distanceToSquared(center) <= r2)
  const seeds = face.filter(
    (v) => labels[v] === -1 || labels[v] === from || labels[v] === id,
  )
  if (!walls) return flood(seeds, enter)
  const wall = folds(FOLDS)
  if (!seeds.some(wall)) return flood(seeds, enter, wall)
  // Pressed inside a fold (a groove, a cavity): that fold opens up, but every
  // other fold still stops it, so it can't spill past the tooth.
  const home = new Uint8Array(labels.length)
  for (const v of flood(seeds, (v) => enter(v) && wall(v))) home[v] = 1
  return flood(seeds, enter, (v) => wall(v) && !home[v])
}

function clear() {
  if (!preview) return
  preview = null
  highlight(null)
  view.invalidate()
}

const mark = (vertices: number[]) => {
  const out = new Uint8Array(data.labels.length)
  for (const v of vertices) out[v] = 1
  return out
}

function tint(hit: Hit, radius: number) {
  if (preview?.radius === radius)
    if (
      same(preview.face, hit.face) ||
      (radius === Infinity && preview.region[hit.seed])
    )
      // Anywhere on the same piece is the same piece.
      return
  const region = mark(area(hit, radius))
  preview = { face: hit.face, radius, region }
  highlight(region, active()?.color ?? '#ffffff')
  view.invalidate()
}

function drag(x: number, y: number) {
  const hit = under(x, y)
  if (!hit || same(hit.face, dab)) return
  if (view.shift) {
    dab = hit.face
    return paint(area(hit, Infinity), doc.get().active)
  }
  zone ??= mark(area(hit, Infinity, true))
  if (!zone[hit.seed]) return
  dab = hit.face
  paint(area(hit, ui.get().radius, true, zone), doc.get().active)
}

/**
 * Paints like the brush, but each dab takes the connected surface within the
 * ring, up to folds, and a drag stays on the part it started on. Hovering
 * previews one dab. Held Shift, or a long press, takes the whole piece instead.
 */
export const fill: Behavior = {
  gesture: 'stroke',
  sized: true,

  hover(point) {
    if (!point) return clear()
    if (view.dirty) return
    const hit = under(...point)
    if (hit) tint(hit, reach())
    else clear()
  },

  press(x, y) {
    clear()
    snapshot()
    target()
    dab = []
    zone = null
    drag(x, y)
  },

  drag,

  release(x, y, { click, long }) {
    const hit = click && long ? under(x, y) : null
    if (hit) {
      const id = target()
      for (const v of area(hit, Infinity)) data.labels[v] = id
    }
    recount()
  },

  abort: discard,
  flush: clear,
  reclass: clear,
}
