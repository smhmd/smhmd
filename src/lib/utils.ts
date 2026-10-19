import { isServer } from './env'
import { interpolate } from './math'

export function uuid(): string {
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  let byteIndex = 0
  let nibbleToggle = false // false => low nibble, true => high nibble

  function getNextNibble() {
    const byte = randomBytes[byteIndex]
    const nibble = nibbleToggle ? (byte >> 4) & 0xf : byte & 0xf
    nibbleToggle = !nibbleToggle
    if (!nibbleToggle) byteIndex++
    return nibble
  }

  return template.replace(/[xy]/g, (char) => {
    let value
    if (char === 'x') {
      value = getNextNibble()
    } else {
      // 'y' character: high bits must be 8, 9, a, or b
      value = (getNextNibble() & 0x3) | 0x8
    }
    return value.toString(16)
  })
}

type Tier = 0 | 1 | 2 | 3 | 4 | 5

/**
 * Device GPU tier detection (0 = very low, 3 = high)
 */
export let gpuTier: Tier = 0

if (!isServer) {
  void measureGpuTier().then((tier) => {
    gpuTier = tier
  })
}

async function measureGpuTier(): Promise<Tier> {
  return new Promise((resolve) => {
    let frames = 0
    const durationMs = 500
    const start = performance.now()

    function loop() {
      frames++

      const elapsed = performance.now() - start

      if (elapsed < durationMs) {
        requestAnimationFrame(loop)
        return
      }

      const fps = 1000 * (frames / elapsed)
      const normal = interpolate(fps, [10, 90], [0, 5])

      resolve(Math.round(normal) as Tier)
    }

    requestAnimationFrame(loop)
  })
}

/** Saves `file` (a blob, or a URL its owner manages) as `name`. */
export function download(file: Blob | string, name: string) {
  const a = document.createElement('a')
  a.href = typeof file === 'string' ? file : URL.createObjectURL(file)
  a.download = name
  a.click()
  // Revoking right away can cancel the download in some browsers.
  if (typeof file !== 'string') setTimeout(() => URL.revokeObjectURL(a.href))
}

/** HSL to hex, with `h` in degrees and `s` and `l` in 0–1. */
export function hslToHex(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  const hex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`
}
