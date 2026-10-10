import { audioContext } from 'src/lib/audio'

import { DEFAULT_BPM, SCHEDULE_AHEAD_TIME, SCHEDULE_INTERVAL } from './common'

// Shared sequencing core. A sequencer is a transport (when to fire), a stepper
// (which index next), and a playhead (which index is sounding now). The only
// thing each sequencer supplies is `onStep`: play this step, return the index
// to surface on the playhead (or -1 to leave it). Everything else is here.

/** Play modes, shared by both step sequencers. */
export const MODES = ['forward', 'backward', 'alternate', 'random'] as const

export type Mode = (typeof MODES)[number]

/** Pick a mode from an unbounded knob value that wraps through the list. */
export function modeAt(knob: number): Mode {
  const n = MODES.length
  return MODES[((Math.floor(knob * n) % n) + n) % n]
}

type Timing = { division: number; swing: number }
type Stepper = (mode: Mode, count: number, length: number) => number

/** Index progression for a step counter. Holds random's anti-repeat memory. */
function createStepper(): Stepper {
  let lastPick = -1
  return (mode, count, length) => {
    if (length <= 1) return 0
    switch (mode) {
      case 'backward':
        return length - 1 - (count % length)
      case 'alternate': {
        // Ping-pong without repeating the endpoints: 0 1 2 3 2 1 …
        const period = 2 * length - 2
        const p = count % period
        return p < length ? p : period - p
      }
      case 'random': {
        let i = Math.floor(Math.random() * length)
        if (i === lastPick) i = (i + 1) % length
        return (lastPick = i)
      }
      default:
        return count % length // forward
    }
  }
}

/** Tracks which scheduled index is actually sounding at a given audio time. */
function createPlayhead() {
  let queue: { value: number; time: number }[] = []
  let current = -1
  return {
    push: (value: number, time: number) => queue.push({ value, time }),
    read(now: number) {
      while (queue.length && queue[0].time <= now)
        current = queue.shift()!.value
      return current
    },
    clear() {
      queue = []
      current = -1
    },
  }
}

/**
 * Build a sequencer. `getTiming` sets tempo + swing; `onStep` plays one step
 * and returns the index to put under the playhead (-1 to skip). The classic
 * two-clock lookahead scheduler lives inside: a coarse interval wakes us, exact
 * note times are computed on the audio clock and scheduled ahead.
 */
export type Sequencer = ReturnType<typeof createSequencer>

export function createSequencer(
  getTiming: () => Timing,
  onStep: (next: Stepper, count: number, time: number) => number,
) {
  const next = createStepper()
  const head = createPlayhead()
  let timer: ReturnType<typeof setInterval> | undefined
  let nextTime = 0
  let count = 0

  function schedule() {
    const { division, swing } = getTiming()
    const beat = (60 / DEFAULT_BPM) * (4 / division)
    while (nextTime < audioContext.currentTime + SCHEDULE_AHEAD_TIME) {
      // swing = the long step's share of each pair: ½ is straight
      const time = nextTime + (count % 2 ? (2 * swing - 1) * beat : 0)
      const value = onStep(next, count, time)
      if (value >= 0) head.push(value, time)
      count++
      nextTime += beat
    }
  }

  return {
    start() {
      if (timer) return
      if (audioContext.state === 'suspended') void audioContext.resume()
      count = 0
      head.clear()
      nextTime = audioContext.currentTime + 0.05
      timer = setInterval(schedule, SCHEDULE_INTERVAL)
    },
    stop() {
      clearInterval(timer)
      timer = undefined
    },
    /** Index sounding at `now`, any play mode (-1 before the first step). */
    playhead: (now: number) => head.read(now),
  }
}
