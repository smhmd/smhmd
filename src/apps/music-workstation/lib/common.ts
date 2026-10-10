import { clamp } from 'src/lib/math'

import type { SoundName } from './audio'

export const APP_ID = 'music-workstation'
export const STEPS = 16
export const DEFAULT_BPM = 120
export const SCHEDULE_AHEAD_TIME = 0.1 // How far ahead to schedule audio (in seconds)
export const SCHEDULE_INTERVAL = 25 // How often to schedule the next audio events (in milliseconds)
export const MAX_STEPS = 32 // Endless sequencer capacity

export type ParameterId = 'blue' | 'brown' | 'gray' | 'orange'
export type Step = string | null // null = rest
export type ScreenId = 'TOMBOLA' | 'ENDLESS' | 'PATTERN'

/** Default state. Shared by the store and the audio graph. */
export const INITIAL = {
  screen: 'TOMBOLA' as ScreenId,
  volume: 0.6, // 0..1
  muted: false,
  sound: 'piano' as SoundName,
  recordStart: 0, // performance.now() when the take started; 0 = not recording
  take: 0, // last take's length in seconds; 0 = none yet
  // tombola
  spin: 1, // -10..10, 0 = no rotation
  gravity: 0.5, // 0..1
  bounce: 0.6, // 0..1
  rods: 0, // 0..1, 0 = closed hexagon, 1 = rods fully rotated open
  // endless (swing / playMode / playing are shared with pattern)
  division: 0, // 0..1 → 1/4 … 1/16
  swing: 0, // 0..1 → SWINGS preset, 0 = straight
  gate: 0, // 0..1 → gate pattern index
  playMode: 0, // unbounded, wraps through the active screen's play modes
  sequence: [] as Step[],
  playing: false,
  // pattern
  grid: Array.from({ length: STEPS }, () => [] as string[]), // notes per step
  cursor: 0, // editing column, always kept inside the window
  length: STEPS, // 1..16 window length (gray / TRIM)
  offset: 0, // 0..15 window start (blue / MOVE)
}

/** The store's shape — the single surface every screen reads. */
export type State = typeof INITIAL

/** A handler's result: a patch to apply, or nothing (side effects only). */
export type Patch = Partial<State> | void

export type KnobKey =
  | 'spin'
  | 'gravity'
  | 'bounce'
  | 'rods'
  | 'division'
  | 'swing'
  | 'gate'
  | 'playMode'

export type Knob = { key: KnobKey; perTurn: number; min: number; max: number }

/**
 * One knob's routing: either a clamped value config, or — for coupled
 * parameters — a reducer from (state, delta) to a patch.
 */
export type KnobEntry = Knob | ((state: State, delta: number) => Partial<State>)

/** Knob → parameter routing per screen. The same four encoders mean
 * different things depending on the active screen. */
export type KnobMap = Record<ParameterId, KnobEntry>

/** Transport/edit buttons routed to the active screen. Buttons with no
 * binding on the current screen are no-ops. */
export type ControlId = 'left' | 'right' | 'play' | 'delete' | 'space'
export type Controls = Partial<Record<ControlId, (state: State) => Patch>>

/**
 * The pattern's active window from raw knob values. Length and offset are
 * stored as floats (so the encoders feel smooth) and resolved to consistent
 * integers here — the one place that rounds, shared by store, grid and HUD.
 */
export function patternWindow({
  length,
  offset,
}: {
  length: number
  offset: number
}) {
  const len = clamp(1, Math.round(length), STEPS)
  const off = clamp(0, Math.round(offset), STEPS - len)
  return { len, off }
}

/** A list entry from a 0..1 knob value. */
export const pick = <T>(list: readonly T[], value: number) =>
  list[Math.min(Math.floor(value * list.length), list.length - 1)]

/**
 * Swing as the classic long:short ratio of each pair of steps — from
 * straight, through the triplet shuffle, to a dotted lilt.
 */
export const SWINGS = [
  { label: '1:1', ratio: 1 / 2 },
  { label: '5:4', ratio: 5 / 9 },
  { label: '3:2', ratio: 3 / 5 },
  { label: '2:1', ratio: 2 / 3 },
  { label: '3:1', ratio: 3 / 4 },
] as const

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** MIDI number of a note name like 'F#3', and back. */
export const midi = (note: string) =>
  NAMES.indexOf(note.slice(0, -1)) + 12 * (Number(note.slice(-1)) + 1)
export const noteName = (m: number) => NAMES[m % 12] + (Math.floor(m / 12) - 1)

/** The keyboard's range, as MIDI numbers. */
export const LOWEST = midi('F3')
export const HIGHEST = midi('E5')

export const KEYS = [
  // Triplet keys:
  { note: 'F#3', variant: 'right' },
  { note: 'G#3', variant: 'middle' },
  { note: 'A#3', variant: 'left' },

  // Twin keys:
  { note: 'C#4', variant: 'right' },
  { note: 'D#4', variant: 'left' },

  // Triplet keys:
  { note: 'F#4', variant: 'right' },
  { note: 'G#4', variant: 'middle' },
  { note: 'A#4', variant: 'left' },

  // Twin keys:
  { note: 'C#5', variant: 'right' },
  { note: 'D#5', variant: 'left' },

  // White keys:
  { note: 'F3', variant: 'vertical' },
  { note: 'G3', variant: 'vertical' },
  { note: 'A3', variant: 'vertical' },
  { note: 'B3', variant: 'vertical' },
  { note: 'C4', variant: 'vertical' },
  { note: 'D4', variant: 'vertical' },
  { note: 'E4', variant: 'vertical' },
  { note: 'F4', variant: 'vertical' },
  { note: 'G4', variant: 'vertical' },
  { note: 'A4', variant: 'vertical' },
  { note: 'B4', variant: 'vertical' },
  { note: 'C5', variant: 'vertical' },
  { note: 'D5', variant: 'vertical' },
  { note: 'E5', variant: 'vertical' },
] as const
