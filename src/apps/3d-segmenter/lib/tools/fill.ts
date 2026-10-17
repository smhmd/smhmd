import { Vector3 } from 'three'

import type { Behavior } from '../common'
import { active, discard, paint, recount, snapshot, target } from '../edit'
import { data, highlight } from '../mesh'
import { doc, ui } from '../state'
import { flood, folds } from '../topology'
import { nearest, pixel, view } from '../view'

/** Fill stops at the most sharply folded 10% of the surface: tooth gaps, gum lines, joints. */
const FOLDS = 10

/**
 * The dab previewed under the pointer: the vertex it grows from, how far (in
 * screen pixels, like the brush ring; Infinity for the whole piece), and the
 * vertices it takes.
 */
let preview: { seed: number; radius: number; region: Uint8Array } | null = null
/** The vertex the last dab grew from, so holding still doesn't redo it. */
let dab = -1
/** Where a stroke started, up to folds: dragging stays on that part, like the first dab. */
let zone: Uint8Array | null = null

/** Held Shift takes the whole connected piece, folds and all. */
const reach = () => (view.shift ? Infinity : ui.get().radius)

/**
 * The surface Fill takes from `seed`: connected, within `radius` pixels of it
 * (as a distance in 3D at its depth), through unlabeled vertices, its own
 * label and the active class, up to folds (other than one it starts in) and
 * inside `within`. An infinite radius without walls is the whole piece.
 */
function area(
  seed: number,
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
  if (!walls) return flood(seed, enter)
  const wall = folds(FOLDS)
  if (!wall(seed)) return flood(seed, enter, wall)
  // Pressed inside a fold (a groove, a cavity): that fold opens up, but every
  // other fold still stops it, so it can't spill past the tooth.
  const home = new Uint8Array(labels.length)
  for (const v of flood(seed, (v) => enter(v) && wall(v))) home[v] = 1
  return flood(seed, enter, (v) => wall(v) && !home[v])
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

function tint(seed: number, radius: number) {
  if (preview?.radius === radius)
    if (preview.seed === seed || (radius === Infinity && preview.region[seed]))
      // Anywhere on the same piece is the same piece.
      return
  const region = mark(area(seed, radius))
  preview = { seed, radius, region }
  highlight(region, active()?.color ?? '#ffffff')
  view.invalidate()
}

function drag(x: number, y: number) {
  const seed = nearest(x, y)
  if (seed < 0 || seed === dab) return
  if (view.shift) {
    dab = seed
    return paint(area(seed, Infinity), doc.get().active)
  }
  zone ??= mark(area(seed, Infinity, true))
  if (!zone[seed]) return
  dab = seed
  paint(area(seed, ui.get().radius, true, zone), doc.get().active)
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
    const seed = nearest(...point)
    if (seed < 0) clear()
    else tint(seed, reach())
  },

  press(x, y) {
    clear()
    snapshot()
    target()
    dab = -1
    zone = null
    drag(x, y)
  },

  drag,

  release(x, y, { click, long }) {
    const seed = click && long ? nearest(x, y) : -1
    if (seed >= 0) {
      const id = target()
      for (const v of area(seed, Infinity)) data.labels[v] = id
    }
    recount()
  },

  abort: discard,
  flush: clear,
  reclass: clear,
}
