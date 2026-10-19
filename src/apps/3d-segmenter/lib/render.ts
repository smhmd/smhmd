import { computed, doc, untracked } from './core'
import * as mesh from './mesh'
import * as session from './session'
import { draw } from './view'

/**
 * What's drawn follows the state it's drawn from. Each effect redraws the
 * canvas after it runs, so nothing else ever needs to.
 */

/** A live edit (not a stroke) stays solid under X-ray until it's kept. */
const live = computed(() => {
  const tx = doc.pending.value
  return tx && !tx.stroke ? tx.base : null
})

/** Starts drawing; returns what stops it. */
export function start() {
  /** What's drawn is what's pickable: hidden parts vanish, X-ray makes finished labels see-through. */
  let model = -1
  const visibility = draw(() => {
    const opened = mesh.opened.value
    void mesh.parts.value
    void doc.labels.settled
    const [xray, base] = [session.xray.value, live.value]
    untracked(() => {
      if (mesh.refresh(xray, base) || opened !== model) mesh.drawn.value++
      model = opened
    })
  })

  /** Label colors: only what was written since the last run, unless the classes changed. */
  let dirty: ArrayLike<number>[] | null = null
  const unlisten = doc.labels.onWrite((elements) => {
    if (elements && dirty) dirty.push(elements)
    else dirty = null
  })
  let painted: doc.Cls[] | null = null
  const colors = draw(() => {
    void mesh.opened.value
    void doc.labels.now
    const classes = doc.classes.value
    untracked(() => {
      mesh.colorize(classes, classes === painted ? dirty : null)
      painted = classes
      dirty = []
    })
  })

  /** The hovered part in the Parts list, or else the selected one. */
  const outline = draw(() => {
    void mesh.opened.value
    const index =
      session.hoveredPart.value >= 0
        ? session.hoveredPart.value
        : session.selectedPart.value
    const part = mesh.parts.value[index]
    untracked(() => mesh.outline(part && !part.hidden ? index : -1))
  })

  return () => [visibility, unlisten, colors, outline].forEach((stop) => stop())
}
