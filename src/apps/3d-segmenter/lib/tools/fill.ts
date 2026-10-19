import { Vector3 } from 'three'

import { FormatColorFill } from 'src/icons'

import * as editor from '../editor'
import { doc } from '../core'
import * as mesh from '../mesh'
import * as session from '../session'
import * as view from '../view'

/** Fill stops at the most sharply folded 10% of the surface: tooth gaps, gum lines, joints. */
const FOLDS = 10

/** Where a dab lands: the triangle under the pointer, and its corner nearest it. */
type Hit = NonNullable<ReturnType<typeof view.under>>

/**
 * The dab previewed under the pointer: the triangle it grows from, what else
 * it depended on, and the vertices it takes.
 */
let preview: {
  face: number[]
  key: string
  capture: unknown
  region: Uint8Array
} | null = null
/** The triangle the last dab grew from, so holding still doesn't redo it. */
let dab: number[] = []

const same = (a: number[], b: number[]) => a.every((v, i) => v === b[i])
/** Where a stroke started, up to folds: dragging stays on that part, like the first dab. */
let zone: Uint8Array | null = null

/** Held Shift takes the whole connected piece, folds and all. */
const reach = () => (session.shift.value ? Infinity : session.radius.value)

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
  const all = doc.labels.settled
  const solid = mesh.pickable()
  const from = all[seed]
  const id = doc.activeId.value
  const position = mesh.data.geometry!.getAttribute('position')
  const center = new Vector3().fromBufferAttribute(position, seed)
  const point = new Vector3()
  const far = radius === Infinity
  const r2 = far ? Infinity : (radius * view.pixel(center)) ** 2
  const enter = (v: number) =>
    solid[v] === 1 &&
    (all[v] === -1 || all[v] === from || all[v] === id) &&
    (!within || within[v] === 1) &&
    (far ||
      point.fromBufferAttribute(position, v).distanceToSquared(center) <= r2)
  const seeds = face.filter(
    (v) => all[v] === -1 || all[v] === from || all[v] === id,
  )
  if (!walls) return mesh.flood(seeds, enter)
  const wall = mesh.folds(FOLDS)
  if (!seeds.some(wall)) return mesh.flood(seeds, enter, wall)
  // Pressed inside a fold (a groove, a cavity): that fold opens up, but every
  // other fold still stops it, so it can't spill past the tooth.
  const home = new Uint8Array(all.length)
  for (const v of mesh.flood(seeds, (v) => enter(v) && wall(v))) home[v] = 1
  return mesh.flood(seeds, enter, (v) => wall(v) && !home[v])
}

function clear() {
  if (!preview) return
  preview = null
  mesh.highlight(null)
}

const mark = (vertices: number[]) => {
  const out = new Uint8Array(doc.labels.peek().length)
  for (const v of vertices) out[v] = 1
  return out
}

/** Previews one dab under a still pointer. */
function hover() {
  const point = session.pointer.value
  if (!point || editor.pressed.value || session.hand.value || view.stale.value)
    return clear()
  const hit = view.under(...point)
  if (!hit) return clear()
  const radius = reach()
  const color = doc.activeClass.value?.color ?? '#ffffff'
  // Everything else a dab depends on: redo it only when one changes.
  const key = [radius, color, doc.labels.version.value, mesh.drawn.value].join()
  if (
    preview?.key === key &&
    preview.capture === view.captured.value &&
    // Anywhere on the same piece is the same piece.
    (same(preview.face, hit.face) ||
      (radius === Infinity && preview.region[hit.seed]))
  )
    return
  const region = mark(area(hit, radius))
  preview = { face: hit.face, key, capture: view.captured.value, region }
  mesh.highlight(region, color)
}

function drag(x: number, y: number, tx: doc.Tx) {
  const hit = view.under(x, y)
  if (!hit || same(hit.face, dab)) return
  if (session.shift.peek()) {
    dab = hit.face
    return tx.paint(area(hit, Infinity), doc.activeId.peek())
  }
  zone ??= mark(area(hit, Infinity, true))
  if (!zone[hit.seed]) return
  dab = hit.face
  tx.paint(area(hit, session.radius.peek(), true, zone), doc.activeId.peek())
}

/**
 * Paints like the brush, but each dab takes the connected surface within the
 * ring, up to folds, and a drag stays on the part it started on. Hovering
 * previews one dab. Held Shift, or a long press, takes the whole piece instead.
 */
export const tool: editor.Tool = {
  id: 'fill',
  label: 'Fill',
  Icon: FormatColorFill,
  key: 'l',
  hint: {
    mouse:
      'Click or drag to fill up to folds · scroll to resize · hold ⇧ for the whole piece',
    touch: 'Tap or drag to fill up to folds · long-press for the whole piece',
  },
  ring: {
    label: 'Fill Reach',
    // A tinted disc: Fill takes an area rather than following a stroke. Held
    // Shift ignores the ring for the whole piece, so it fades.
    style: 'border-white/80 bg-white/15 in-data-shift:opacity-30',
  },
  gesture: 'stroke',

  press(x, y, tx) {
    doc.targetClass()
    dab = []
    zone = null
    drag(x, y, tx)
  },

  drag,

  release(x, y, { click, long }, tx) {
    const hit = click && long ? view.under(x, y) : null
    if (hit) tx.paint(area(hit, Infinity), doc.targetClass())
  },

  activate() {
    const stop = view.draw(hover)
    return () => {
      stop()
      clear()
      view.three.invalidate()
    }
  },
}
