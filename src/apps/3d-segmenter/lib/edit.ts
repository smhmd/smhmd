import { colorAt, type Cls } from './common'
import { colorize, data, refresh, tally } from './mesh'
import { activeClass, doc, ui } from './state'
import { view } from './view'

/**
 * Label edits and their history. Tools write `data.labels` directly mid-gesture
 * and call `recount` when done; `snapshot` before, for one undo step.
 */

type Snapshot = { labels: Int32Array; classes: Cls[] }
const past: Snapshot[] = []
const future: Snapshot[] = []

const counts = () => ui.set({ past: past.length, future: future.length })

/** Repaints label colors: all of them, or just the vertices a stroke touched. */
export function recolor(vertices?: number[]) {
  colorize(doc.get().classes, vertices)
  view.invalidate()
}

/**
 * Updates what's drawn and pickable. With X-ray, labels turn see-through once
 * they're done: a stroke when it ends, a selection when it's applied.
 */
export function sync() {
  if (refresh(ui.get().xray)) view.dirty = true
  view.invalidate()
}

/** After labels change: class and part counts, visibility and colors catch up. */
export function recount() {
  doc.set({ classes: tally(doc.get().classes), parts: data.parts })
  sync()
  recolor()
}

/** Writes `id` to `vertices` mid-gesture, repainting only those. */
export function paint(vertices: number[], id: number) {
  for (const v of vertices) data.labels[v] = id
  recolor(vertices)
}

export function snapshot() {
  past.push({ labels: data.labels.slice(), classes: doc.get().classes })
  if (past.length > 50) past.shift()
  future.length = 0
  counts()
}

function restore(from: Snapshot[], to: Snapshot[]) {
  const s = from.pop()
  if (!s) return
  to.push({ labels: data.labels.slice(), classes: doc.get().classes })
  data.labels.set(s.labels)
  // Visibility isn't an edit, so undo leaves it as it is.
  const { classes } = doc.get()
  const hidden = (id: number) => !!classes.find((c) => c.id === id)?.hidden
  doc.set({
    classes: s.classes.map((c) =>
      c.hidden === hidden(c.id) ? c : { ...c, hidden: !c.hidden },
    ),
  })
  counts()
  recount()
}

export const undo = () => restore(past, future)
export const redo = () => restore(future, past)
/** Drops everything since the last snapshot, without a redo step. */
export const discard = () => restore(past, [])

export function forget() {
  past.length = future.length = 0
  counts()
}

export function addClass() {
  const { classes } = doc.get()
  const id = Math.max(-1, ...classes.map((c) => c.id)) + 1
  const cls = {
    id,
    name: `class ${id + 1}`,
    color: colorAt(classes.length),
    hidden: false,
    count: 0,
  }
  doc.set({ classes: [...classes, cls], active: id })
  recolor()
}

/** The class new labels go to, created on demand so painting never needs a setup step. */
export function target() {
  if (!activeClass(doc.get())) addClass()
  return doc.get().active
}
