import { clamp } from 'src/lib/math'
import { createStore } from 'src/lib/react'
import { Recorder } from 'src/lib/recorder'

import * as ENDLESS from '../screens/endless/reducer'
import * as PATTERN from '../screens/pattern/reducer'
import * as TOMBOLA from '../screens/tombola/reducer'
import { audio, type SoundName } from './audio'
import type { ControlId, ParameterId, ScreenId, State } from './common'
import { APP_ID, INITIAL } from './common'

/** Each screen's behavior: keyboard, knob routing, and control bindings. */
export const SCREENS = { TOMBOLA, ENDLESS, PATTERN }

export const store = createStore({ ...INITIAL })

const screen = () => SCREENS[store.get().screen]

// Created on first use, so nothing touches the AudioContext during SSR.
let recorder: Recorder | undefined
const takeRecorder = () => (recorder ??= new Recorder())

export const api = {
  /** Switch screens — and never come back to a ghost transport. */
  show(next: ScreenId) {
    store.set({ screen: next, playing: false })
  },

  changeVolume(delta: number) {
    const { volume, muted } = store.get()
    const next = clamp(0, volume + delta, 1)
    store.set({ volume: next })
    audio.setVolume(muted ? 0 : next)
  },

  muteVolume() {
    const { volume, muted } = store.get()
    store.set({ muted: !muted })
    audio.setVolume(muted ? volume : 0)
  },

  setSound(name: SoundName) {
    audio.setSound(name)
  },

  attackNote(note: string) {
    const patch = screen().attack(store.get(), note)
    if (patch) store.set(patch)
  },

  releaseNote() {},

  /** Transport/edit buttons; the active screen decides what they do.
   * Unbound buttons are no-ops. */
  control(id: ControlId) {
    const patch = screen().controls[id]?.(store.get())
    if (patch) store.set(patch)
  },

  record() {
    // A second press would orphan the running MediaRecorder mid-take
    if (store.get().recording) return
    takeRecorder().record()
    store.set({ recording: true })
  },

  async stopRecording() {
    await takeRecorder().stop()
    store.set({ recording: false })
  },

  /** Saves the last take. No-op if nothing was recorded yet. */
  download() {
    recorder?.download(`${APP_ID}.webm`)
  },

  /** Route an endless-encoder delta through the screen's knob map. */
  changeParameter({ id, delta }: { id: ParameterId; delta: number }) {
    const entry = screen().knobs[id]
    const state = store.get()
    if (typeof entry === 'function') return store.set(entry(state, delta))
    const { key, perTurn, min, max } = entry
    store.set({
      [key]: clamp(min, state[key] + delta * perTurn, max),
    } as Partial<State>)
  },
}
