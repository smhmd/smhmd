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
// Recorder starts and stops run in order, so a take's tail can finish
// recording while the UI has already moved on.
let tape: Promise<unknown> = Promise.resolve()
let takeId = ''
const TAIL = 1800 // ms of reverb/echo tail kept after stop
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

  setSound(sound: SoundName) {
    audio.setSound(sound)
    store.set({ sound })
  },

  attackNote(note: string) {
    const patch = screen().attack(store.get(), note)
    if (patch) store.set(patch)
  },

  /** Transport/edit keys; the active screen decides what they do.
   * Unbound keys are no-ops. */
  control(id: ControlId) {
    const patch = screen().controls[id]?.(store.get())
    if (patch) store.set(patch)
  },

  record() {
    if (store.get().recordStart) return
    store.set({ recordStart: performance.now(), take: 0 })
    takeId = Math.random().toString(36).slice(2, 6) // names this take's file
    tape = tape.then(() => takeRecorder().record())
  },

  /**
   * Stops the transport and the take. The screen answers at once — the
   * counter freezes on the take's length — while the recorder rolls on for
   * the reverb tail in the background.
   */
  stop() {
    store.set({ playing: false })
    const { recordStart } = store.get()
    if (!recordStart) return
    store.set({
      recordStart: 0,
      take: (performance.now() - recordStart) / 1000,
    })
    tape = tape
      .then(() => wait(TAIL))
      // The take's file exists as soon as recording stops; the recorder then
      // waits on audio metadata some browsers never send, so don't hang on it.
      .then(() => Promise.race([takeRecorder().stop(), wait(1500)]))
  },

  /** Saves the last take, once its tail is in. No-op before any take. */
  async download() {
    await tape
    recorder?.download(`${APP_ID}-${takeId}.webm`)
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
