import { audioContext, globalGain } from 'src/lib/audio'
import { Instrument } from 'src/lib/instrument'
import { rand } from 'src/lib/math'
import { SAMPLES } from 'src/lib/samples'
import { clientOnly } from 'src/lib/ssr'

import { DEFAULT_BPM, INITIAL } from './common'

// Sequencers resolve the instrument per hit, so a sound change lands on the next note.
export type SoundName = keyof typeof SAMPLES

let current: SoundName = INITIAL.sound
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

instrument() // preload the default sound

/**
 * Each note → [dry, echo, reverb] → master → limiter → globalGain (which the
 * recorder taps). Small and fixed: the effects are part of the instrument's
 * voice, not something to tweak.
 */
const bus = clientOnly(() => {
  const ctx = audioContext
  const master = new GainNode(ctx, { gain: INITIAL.volume })
  // Catches dense Tombola pile-ups so a take never clips.
  const limiter = new DynamicsCompressorNode(ctx, {
    threshold: -10,
    knee: 6,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
  })
  master.connect(limiter).connect(globalGain)

  // Reverb: a short pre-delay keeps the attack clear; the high-pass keeps the
  // low end out of the tail, so chords don't turn to mud.
  const reverb = new GainNode(ctx, { gain: 0.4 })
  reverb
    .connect(new DelayNode(ctx, { delayTime: 0.025 }))
    .connect(new BiquadFilterNode(ctx, { type: 'highpass', frequency: 250 }))
    .connect(new ConvolverNode(ctx, { buffer: impulseResponse(3.2) }))
    .connect(master)

  // Echo: dotted eighths, each repeat darker, and fed into the reverb too.
  const echo = new GainNode(ctx, { gain: 0.16 })
  const delay = new DelayNode(ctx, { delayTime: (60 / DEFAULT_BPM) * 0.75 })
  const tone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 2400 })
  const feedback = new GainNode(ctx, { gain: 0.38 })
  echo.connect(delay).connect(tone).connect(feedback).connect(delay)
  tone.connect(master)
  tone.connect(reverb)

  return { master, reverb, echo }
})

/**
 * A synthetic room: noise through a low-pass that closes as it decays — the
 * highs die first, like real air — fading to -60 dB by the end.
 */
function impulseResponse(seconds: number) {
  const { sampleRate } = audioContext
  const length = Math.floor(sampleRate * seconds)
  const buffer = audioContext.createBuffer(2, length, sampleRate)
  for (const channel of [0, 1]) {
    const data = buffer.getChannelData(channel)
    let lowpassed = 0
    for (let i = 0; i < length; i++) {
      const t = i / length
      lowpassed += (0.9 - 0.8 * t) * (rand() - lowpassed)
      data[i] = lowpassed * Math.exp(-6.9 * t)
    }
  }
  return buffer
}

export const audio = {
  /** `when` is AudioContext time. */
  play(note: string, velocity = 1, when?: number) {
    // a slight random pan per note widens repeated notes into a space
    const voice = new StereoPannerNode(audioContext, { pan: rand(0.15) })
    voice.connect(bus.master)
    voice.connect(bus.reverb)
    voice.connect(bus.echo)
    instrument().play(note, { velocity, when, destination: voice })
  },

  setSound(name: SoundName) {
    current = name
    instrument()
  },

  setVolume(value: number) {
    // Glide instead of jumping, so dragging the knob or muting doesn't click
    bus.master.gain.setTargetAtTime(value, audioContext.currentTime, 0.015)
  },
}
