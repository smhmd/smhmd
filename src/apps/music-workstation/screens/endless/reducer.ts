import { audio } from '../../lib/audio'
import type { Controls, KnobMap, State } from '../../lib/common'
import { HIGHEST, LOWEST, MAX_STEPS, midi, noteName } from '../../lib/common'

export const knobs: KnobMap = {
  blue: { key: 'division', perTurn: 1, min: 0, max: 1 },
  brown: { key: 'swing', perTurn: 1, min: 0, max: 1 },
  gray: { key: 'gate', perTurn: 1, min: 0, max: 1 },
  // Unbounded: keeps wrapping through the play modes forever
  orange: { key: 'playMode', perTurn: 1, min: -Infinity, max: Infinity },
}

/**
 * A key press records the note (live edits welcome) and gives immediate
 * feedback only when the transport is stopped.
 */
export function attack(state: State, note: string) {
  if (!state.playing) audio.play(note)
  if (state.sequence.length === MAX_STEPS) return
  return { sequence: [...state.sequence, note] }
}

/** Shift the whole melody by semitones — unless it would leave the keyboard. */
function transpose({ sequence }: State, by: number) {
  const pitches = sequence.map((note) =>
    note === null ? null : midi(note) + by,
  )
  if (pitches.some((m) => m !== null && (m < LOWEST || m > HIGHEST))) return
  return { sequence: pitches.map((m) => (m === null ? null : noteName(m))) }
}

// left / right transpose, space appends a rest, scissors removes the last step.
export const controls: Controls = {
  left: (state) => transpose(state, -1),
  right: (state) => transpose(state, 1),
  space: ({ sequence }) =>
    sequence.length < MAX_STEPS ? { sequence: [...sequence, null] } : undefined,
  delete: ({ sequence }) => ({ sequence: sequence.slice(0, -1) }),
  play: ({ playing }) => ({ playing: !playing }),
}
