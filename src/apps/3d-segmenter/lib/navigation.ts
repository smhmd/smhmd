import { MOUSE, TOUCH } from 'three'

import { effect, type ReadonlySignal } from './core'
import { pressed, type Tool } from './editor'
import * as session from './session'
import * as view from './view'

/**
 * How the orbit controls read input. They see every pointer, so a second
 * finger makes a clean two-finger orbit and pinch, but while a tool owns the
 * pointer they leave its left button and single finger alone; they're never
 * disabled mid-gesture, or they'd lose the first finger. With the hand held,
 * left orbits and right pans, as in Move: the controls would pan on a ⌘- or
 * Ctrl-drag otherwise. Returns what stops it.
 */
export const start = (tool: ReadonlySignal<Tool>): (() => void) =>
  effect(() => {
    void view.connected.value
    const { controls } = view.three
    if (!controls) return
    const held = session.hand.value
    const busy = pressed.value
    const { gesture } = tool.value
    Object.assign(controls.mouseButtons, {
      LEFT: busy ? null : held ? MOUSE.PAN : MOUSE.ROTATE,
      RIGHT: held ? MOUSE.ROTATE : MOUSE.PAN,
    })
    Object.assign(controls.touches, {
      ONE: busy ? null : TOUCH.ROTATE,
      // A tool takes one finger, so two orbit and pinch; in Move, two pan and pinch.
      TWO: gesture ? TOUCH.DOLLY_ROTATE : TOUCH.DOLLY_PAN,
    })
  })
