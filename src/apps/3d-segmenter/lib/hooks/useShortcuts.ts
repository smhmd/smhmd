import { useEffect } from 'react'

import { isMac } from 'src/lib/env'

import { keys } from '../app'
import { MOD } from '../platform'
import * as session from '../session'

type Held = 'hand' | 'shift'
const HELD = { hand: session.hand, shift: session.shift }
const KEYS: Record<string, Held> = { [MOD]: 'hand', Shift: 'shift' }

/** Space and Enter on a focused control press it, as they should. */
const CONTROL =
  'button, a, [role=button], [role=menuitem], [role=option], [role=switch], [role=slider], [role=checkbox]'

/** A held key changes what the pointer does; `data-hand` and friends let CSS show it. */
function hold(key: Held, down: boolean) {
  if (HELD[key].peek() === down) return
  HELD[key].value = down
  document.body.toggleAttribute(`data-${key}`, down)
}

/** The keymap's name for a key press: `x`, `mod+z`, `mod+shift+z`, `digit1`. */
function name(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey
  // The physical number row, whatever the layout prints on it.
  const key = /^Digit[1-9]$/.test(e.code) ? e.code : e.key
  return `${mod ? 'mod+' : ''}${mod && e.shiftKey ? 'shift+' : ''}${key.toLowerCase()}`
}

/** Figma-style single-key shortcuts, from the keymap; ignored while typing. */
export function useShortcuts() {
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'Shift') hold('shift', true)
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, [role=dialog]')) return
      if (e.key === MOD) return hold('hand', true)
      // ⌘ or Ctrl plus another key is a shortcut, not a hold to move.
      if (isMac ? e.metaKey : e.ctrlKey) hold('hand', false)
      if (e.altKey) return
      const key = name(e)
      if ((key === ' ' || key === 'enter') && target.closest(CONTROL)) return
      const run = keys.get(key)
      if (!run) return
      e.preventDefault()
      run()
    }
    const up = (e: KeyboardEvent) => KEYS[e.key] && hold(KEYS[e.key], false)
    // Switching tabs mid-press never delivers the keyup.
    const blur = () => Object.values(KEYS).forEach((key) => hold(key, false))
    const controller = new AbortController()
    const { signal } = controller
    window.addEventListener('keydown', down, { signal })
    window.addEventListener('keyup', up, { signal })
    window.addEventListener('blur', blur, { signal })
    return () => controller.abort()
  }, [])
}
