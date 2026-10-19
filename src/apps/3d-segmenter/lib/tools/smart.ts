import { AutoFix } from 'src/icons'

import type { Box, Point } from '../common'
import * as editor from '../editor'
import { batch, computed, doc, effects, signal, untracked } from '../core'
import { sam } from '../sam'
import * as view from '../view'

const NONE = { points: [] as Point[], box: null as Box | null }

/** The prompts, in screen pixels. */
export const prompts = signal(NONE)
/** A selection is live: further clicks refine it; Space keeps it, Esc undoes it. */
export const selecting = computed(() => sam.mask.value !== null)

/** Labels the vertices seen inside the mask, live: each answer redoes the selection from scratch. */
function apply() {
  const mask = sam.mask.value
  const { points, box } = prompts.value
  void doc.activeId.value // picking a class mid-selection relabels it
  if (!mask || (!points.length && !box)) return
  untracked(() => {
    const w = view.captured.peek()?.width ?? 0
    const tx = editor.live()
    tx.restore()
    tx.paint(
      view.pick((x, y) => mask[(y | 0) * w + (x | 0)] > 0),
      doc.targetClass(),
    )
  })
}

/** Encodes each view once the model is ready, then sends the prompts; prompts made before it was ready wait for it. */
let encoded: view.Capture | null = null
function ask() {
  const ready = sam.model.value === 'ready'
  const capture = view.captured.value
  const { points, box } = prompts.value
  if (!ready) return void (encoded = null)
  untracked(() => {
    if (!capture?.frame) return
    if (capture !== encoded) {
      encoded = capture
      sam.encode()
    }
    if (points.length || box) sam.decode(points, box)
  })
}

/**
 * Drag a box, the model's strongest prompt, to start a selection; click to
 * add a point, Alt-click or long-press for one that excludes.
 */
export const tool: editor.Tool = {
  id: 'smart',
  label: 'Smart Select',
  Icon: AutoFix,
  key: 's',
  gesture: 'box',
  needsImage: true,

  release(x, y, { click, long, alt, from: [x0, y0] }) {
    const { points, box } = prompts.peek()
    if (click)
      return void (prompts.value = {
        points: [...points, { x, y, positive: !alt && !long }],
        box,
      })
    // A new box is a new selection.
    editor.complete()
    prompts.value = {
      points: [],
      box: [Math.min(x0, x), Math.min(y0, y), Math.max(x0, x), Math.max(y0, y)],
    }
  },

  activate: () => effects(ask, apply),

  end() {
    batch(() => {
      prompts.value = NONE
      sam.mask.value = null
    })
  },
}
