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
