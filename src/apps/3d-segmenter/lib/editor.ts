import type { Brush } from 'src/icons'

import type { Release } from './common'
import {
  batch,
  computed,
  doc,
  effects,
  type ReadonlySignal,
  signal,
  untracked,
} from './core'
import * as mesh from './mesh'
import * as session from './session'
import * as view from './view'

/**
 * The editor: the interaction in flight, and the commands around it. Tools
 * and commands only declare what they do; when the interaction ends, what's
 * undone, what's captured and when, all follow from here.
 */

export type Tool = view.Needs & {
  /** For the toolbar's value; code compares tools themselves. */
  id: string
  label: string
  Icon: typeof Brush
  key: string
  /** What it does next, with a mouse and by touch. Smart Select's depends on the model. */
  hint?: { mouse: string; touch: string }
  /** The ring that follows the pointer: its name (scroll and [ ] resize it) and how it looks. */
  ring?: { label: string; style: string }
  /** While it's the active tool: effects, like a preview under the pointer. Returns what stops them. */
  activate?(): () => void
  /** Its interaction ended, completed or cancelled: clear whatever it showed for it. */
  end?(): void
} & (
    | { gesture?: never }
    /** A left-drag paints along the way, as one transaction: undone if the drag is cancelled. */
    | {
        gesture: 'stroke'
        press(x: number, y: number, tx: doc.Tx): void
        drag(x: number, y: number, tx: doc.Tx): void
        release?(x: number, y: number, how: Release, tx: doc.Tx): void
      }
    /** A left-drag draws a box. */
    | { gesture: 'box'; release(x: number, y: number, how: Release): void }
  )

/** The active tool, once `start` is given it. */
let active: ReadonlySignal<Tool | undefined> = signal(undefined)
const current = () => active.peek()

/** Something the UI can do. One that `interrupts` completes the interaction in flight first. */
export function command<A extends unknown[], R>(
  run: (...args: A) => R,
  { interrupts = false } = {},
) {
  return (...args: A) => {
    if (interrupts) complete()
    return run(...args)
  }
}

/** A command that edits the document: one step of history, after the interaction in flight completes. */
export const edit = <A extends unknown[]>(
  run: (tx: doc.Tx, ...args: A) => void,
) =>
  command((...args: A) => doc.transact((tx) => run(tx, ...args)), {
    interrupts: true,
  })

let stroke: doc.Tx | null = null
/** A tool's drag is underway. */
export const pressed = signal(false)

/** Where a tool's live edit goes: the open transaction, or a new one. Completing keeps it; cancelling undoes it. */
export const live = () => doc.pending.peek() ?? doc.begin()

function end(keep: boolean) {
  const had = !!doc.pending.peek() && !stroke
  batch(() => {
    if (stroke || !keep) doc.abort()
    else doc.commit()
    stroke = null
    current()?.end?.()
  })
  return had
}

/** Ends the interaction in flight, keeping its live edit: Space, Enter, or a command that interrupts. A stroke cut short is still undone. */
export const complete = () => end(true)
/** Ends the interaction in flight, undoing its live edit: Esc. Returns whether there was one. */
export const cancel = () => end(false)

let timer: ReturnType<typeof setTimeout> | undefined
function recapture() {
  clearTimeout(timer)
  view.capture(current() ?? {})
}
/** Before anything picks: the capture must match the camera. */
const fresh = () => view.stale.peek() && recapture()

/** The camera moved: whatever was in flight belongs to the old view, so complete it, and capture once the camera settles. */
export function cameraMoved() {
  complete()
  view.stale.value = true
  clearTimeout(timer)
  timer = setTimeout(recapture, 250)
}

/** Pointer input on the canvas, as the active tool's press, drag and release. */
export const input = {
  press(x: number, y: number) {
    batch(() => {
      pressed.value = true
      fresh()
      const t = current()
      if (t?.gesture === 'stroke')
        t.press(x, y, (stroke = doc.begin({ stroke: true })))
    })
  },
  drag(x: number, y: number) {
    const t = current()
    if (t?.gesture === 'stroke' && stroke) t.drag(x, y, stroke)
  },
  release(x: number, y: number, how: Release) {
    batch(() => {
      pressed.value = false
      fresh()
      const t = current()
      if (t?.gesture === 'box') t.release(x, y, how)
      if (t?.gesture !== 'stroke' || !stroke) return
      t.release?.(x, y, how, stroke)
      stroke = null
      doc.commit()
    })
  },
  /** The drag was navigation after all (a second finger landed), or the browser took it over. */
  abort() {
    batch(() => {
      pressed.value = false
      if (stroke) doc.abort()
      stroke = null
    })
  },
  hover: (x: number, y: number) => void (session.pointer.value = [x, y]),
  leave: () => void (session.pointer.value = null),
}

/** Drives `tool`: runs its effects while it's active, and keeps the capture shaped for it. Returns what stops it. */
export function start(tool: ReadonlySignal<Tool>) {
  active = tool
  const needs = computed(
    () => `${!!tool.value.needsImage}${!!tool.value.ignoresXray}`,
  )
  return effects(
    () => {
      const t = tool.value
      return untracked(() => t.activate?.())
    },
    // The capture is shaped by what's drawn and what the tool needs: retake it as soon as either changes.
    () => {
      void view.connected.value
      void mesh.drawn.value
      void needs.value
      untracked(recapture)
    },
  )
}
