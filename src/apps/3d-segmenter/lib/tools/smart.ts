import type { Behavior, Box, Point } from '../common'
import { discard, recount, snapshot, sync, target } from '../edit'
import { data } from '../mesh'
import { sam } from '../sam'
import { prompts, ui } from '../state'
import { inMask, pick, view } from '../view'

const bump = () => ui.set({ frame: ui.get().frame + 1 })

/** Labels the visible vertices inside the mask, from the labels before the selection. */
function relabel() {
  data.labels.set(data.base!)
  const id = target()
  for (const v of pick(inMask)) data.labels[v] = id
  recount()
}

/** Before the model is ready, prompts wait on screen and run once it is. */
function prompt(points: Point[], box: Box | null) {
  prompts.set({ points, box })
  if (sam.ready) sam.decode(points, box)
}

/** The model's answer: labels are applied live, each answer from scratch. */
export function mask(mask: Uint8Array) {
  view.mask = mask
  if (!data.base) {
    snapshot()
    data.base = data.labels.slice()
  }
  relabel()
  bump()
  ui.set({ status: 'ready', selecting: true })
}

/** Labels are applied as you click; this just ends the selection. */
export function finish() {
  const { points, box } = prompts.get()
  if (!data.base && !points.length && !box) return
  const applied = data.base
  data.base = null
  if (applied) sync()
  view.mask = new Uint8Array(0)
  bump()
  prompts.set({ points: [], box: null })
  ui.set({ selecting: false })
}

/** Undoes the live selection as if it never happened; false when there's none. */
export function cancel() {
  const live = !!data.base
  if (live) discard()
  finish()
  return live
}

/**
 * Drag a box, the model's strongest prompt, to start a selection; click to
 * add a point, Alt-click or long-press for one that excludes.
 */
export const smart: Behavior = {
  gesture: 'box',
  image: true,

  release(x, y, { click, long, alt, from: [x0, y0] }) {
    if (click)
      return prompt(
        [...prompts.get().points, { x, y, positive: !alt && !long }],
        prompts.get().box,
      )
    finish()
    prompt(
      [],
      [Math.min(x0, x), Math.min(y0, y), Math.max(x0, x), Math.max(y0, y)],
    )
  },

  settled() {
    bump()
    sam.encode()
    // Prompts left waiting on the model, which just arrived.
    const { points, box } = prompts.get()
    if (points.length || box) sam.decode(points, box)
  },

  /** Picking a class mid-selection relabels it: click an object, then press 3. */
  reclass() {
    if (data.base) relabel()
  },

  flush: finish,
}
