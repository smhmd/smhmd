import { useSyncExternalStore } from 'react'

/** Apple keyboards hold ⌘ where others hold Ctrl. */
export const MAC =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform)

/** The primary modifier, as `KeyboardEvent.key` names it. */
export const MOD = MAC ? 'Meta' : 'Control'

const subscribe = () => () => {}

/**
 * The primary modifier, written for hints: `mod` alone, `key(k)` with a key.
 * The server can't know the platform, so it says Ctrl until hydrated.
 */
export function useMod() {
  const mac = useSyncExternalStore(
    subscribe,
    () => MAC,
    () => false,
  )
  return {
    mod: mac ? '⌘' : 'Ctrl',
    key: (k: string) => (mac ? `⌘${k}` : `Ctrl+${k}`),
    shift: (k: string) => (mac ? `⇧⌘${k}` : `Ctrl+Shift+${k}`),
  }
}

/** Tailwind's `lg`: panels dock on large screens and float on phones. */
const WIDE = '(min-width: 64rem)'

const media = (change: () => void) => {
  const query = matchMedia(WIDE)
  query.addEventListener('change', change)
  return () => query.removeEventListener('change', change)
}

/** Whether the screen is large. The server renders the large layout. */
export const useWide = () =>
  useSyncExternalStore(
    media,
    () => matchMedia(WIDE).matches,
    () => true,
  )
