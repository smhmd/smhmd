import type { Shading } from './common'
import { signal } from './core'

/** The session: how you’re looking and working. None of it is exported or undone. */

/** The ring's radius, in screen pixels. */
export const radius = signal(24)
/** The selected part, and the one under the pointer in the Parts list; -1 for none. */
export const selectedPart = signal(-1)
export const hoveredPart = signal(-1)
export const shading = signal<Shading>('textures')
export const grid = signal(true)
/** Labels turn see-through and can't be painted over, revealing what's behind. */
export const xray = signal(false)

/** Held keys. ⌘ (Ctrl off Apple) turns every tool into the hand, like Figma's Space. */
export const hand = signal(false)
export const shift = signal(false)
/** The pointer over the canvas, in canvas pixels; null when it's elsewhere. */
export const pointer = signal<readonly [number, number] | null>(null)

/** The file being opened, for the status. */
export const opening = signal('')
/** A passing error for the status, like a file that couldn't be opened. */
export const notice = signal('')

let timer: ReturnType<typeof setTimeout> | undefined

/** Shows a passing error in the status for a few seconds. */
export function notify(text: string) {
  clearTimeout(timer)
  notice.value = text
  timer = setTimeout(() => (notice.value = ''), 5000)
}
