import { audioContext } from 'src/lib/audio'
import { clamp } from 'src/lib/math'

import { audio } from '../../lib/audio'
import type { Controls, KnobMap, State } from '../../lib/common'
import { patternWindow, STEPS } from '../../lib/common'
import { pattern } from './sequencer'

/** blue → move the window; the cursor is dragged along to stay inside it. */
function move(state: State, delta: number): Partial<State> {
  const offset = clamp(0, state.offset + delta * STEPS, STEPS - state.length)
  const { len, off } = patternWindow({ length: state.length, offset })
  return { offset, cursor: clamp(off, state.cursor, off + len - 1) }
}

/** gray → trim the window. Grows right first: pinned to the right edge once it fills. */
function trim(state: State, delta: number): Partial<State> {
  const length = clamp(1, state.length + delta * STEPS, STEPS)
  const offset = Math.min(state.offset, STEPS - length)
  const { len, off } = patternWindow({ length, offset })
  return { length, offset, cursor: clamp(off, state.cursor, off + len - 1) }
}

// brown / orange borrow endless's swing + play modes; blue / gray drive the
// coupled window (offset / length), so they're reducers instead of configs.
export const knobs: KnobMap = {
  blue: move,
  brown: { key: 'swing', perTurn: 1, min: 0, max: 1 },
  gray: trim,
  orange: { key: 'playMode', perTurn: 1, min: -Infinity, max: Infinity },
}

/**
 * The step a key or scissors acts on: the edit cursor when stopped; while
 * playing (live mode), the step sounding right now.
 */
function target(state: State) {
  if (!state.playing) return state.cursor
  return Math.max(
    patternWindow(state).off,
    pattern.playhead(audioContext.currentTime),
  )
}

const setColumn = (state: State, col: number, notes: string[]) => ({
  grid: state.grid.map((c, i) => (i === col ? notes : c)),
})

/**
 * Stopped: toggle the note at the cursor, then step forward (wrapping in the
 * window) — so a run of keys writes a melody. Live: add it to the sounding step.
 */
export function attack(state: State, note: string) {
  const col = target(state)
  const column = state.grid[col]
  const has = column.includes(note)
  if (!has) audio.play(note)
  if (state.playing)
    return has ? undefined : setColumn(state, col, [...column, note])
  const { len, off } = patternWindow(state)
  return {
    ...setColumn(
      state,
      col,
      has ? column.filter((n) => n !== note) : [...column, note],
    ),
    cursor: off + ((col - off + 1) % len),
  }
}

export const controls: Controls = {
  // Nudge the cursor within the window.
  left(state) {
    const { off } = patternWindow(state)
    return { cursor: Math.max(off, state.cursor - 1) }
  },
  right(state) {
    const { len, off } = patternWindow(state)
    return { cursor: Math.min(off + len - 1, state.cursor + 1) }
  },
  // A rest: step forward, leaving the column untouched.
  space(state) {
    const { len, off } = patternWindow(state)
    return { cursor: off + ((state.cursor - off + 1) % len) }
  },
  // Play / pause; pausing parks the cursor at the window start.
  play(state) {
    return { playing: !state.playing, cursor: patternWindow(state).off }
  },
  // Scissors. Live: clear the sounding step. Stopped: a backspace — clear the
  // cursor's step, or if it's empty, step back and clear that one.
  delete(state) {
    const col = target(state)
    if (state.playing || state.grid[col].length)
      return setColumn(state, col, [])
    const prev = Math.max(patternWindow(state).off, col - 1)
    return { ...setColumn(state, prev, []), cursor: prev }
  },
}
