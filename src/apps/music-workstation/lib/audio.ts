import { audioContext, globalGain } from 'src/lib/audio'
import { Instrument } from 'src/lib/instrument'
import { SAMPLES } from 'src/lib/samples'
import { clientOnly } from 'src/lib/ssr'

import { INITIAL } from './common'

// Routed through globalGain so the Recorder captures everything. Sequencers
// resolve `current` per hit, so a sound change lands on the next note.
export type SoundName = keyof typeof SAMPLES

let current: SoundName = 'harp'
const instruments = new Map<SoundName, Instrument>()

function instrument() {
  let cached = instruments.get(current)
  if (!cached) {
    // a few random cents per hit, so repeated notes don't sound identical
    cached = new Instrument({ ...SAMPLES[current], jitter: 3 })
    instruments.set(current, cached)
  }
  return cached
}

// preload the default sound
instrument()

const master = clientOnly(() => {
  const gain = new GainNode(audioContext, { gain: INITIAL.volume })
  gain.connect(globalGain)
  return gain
})

const reverb = clientOnly(() => {
  const convolver = new ConvolverNode(audioContext, {
    buffer: impulseResponse(2, 4),
  })
  const wet = new GainNode(audioContext, { gain: 0.3 })
  convolver.connect(wet).connect(master)
  return convolver
})

function impulseResponse(seconds: number, decay: number) {
  const length = audioContext.sampleRate * seconds
  const buffer = audioContext.createBuffer(2, length, audioContext.sampleRate)
  for (const channel of [0, 1]) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
    }
  }
  return buffer
}

function output() {
  const pan = new StereoPannerNode(audioContext, {
    pan: Math.random() * 0.24 - 0.12,
  })
  pan.connect(master) // dry
  pan.connect(reverb) // wet send
  return pan
}

export const audio = {
  /** `when` is AudioContext time. */
  play(note: string, velocity = 1, when?: number) {
    instrument().play(note, { velocity, when, destination: output() })
  },

  setSound(name: SoundName) {
    current = name
    instrument()
  },

  setVolume(value: number) {
    // Glide instead of jumping, so dragging the knob or muting doesn't click
    master.gain.setTargetAtTime(value, audioContext.currentTime, 0.015)
  },
}
