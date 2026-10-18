import { useEffect } from 'react'

import { isMac } from 'src/lib/env'

import { api } from '../api'
import { type Shading, type Tool, TOOL_KEYS, TOOL_ORDER } from '../common'
import { MOD } from '../platform'
import { doc, ui } from '../state'
import { view } from '../view'

const TOOLS: Record<string, Tool> = Object.fromEntries(
  TOOL_ORDER.map((tool) => [TOOL_KEYS[tool], tool]),
)

/** T and W pick their shading, or go back to Solid if it's already on. */
const shade = (shading: Shading) =>
  api.setShading(ui.get().shading === shading ? 'solid' : shading)

const ACTIONS: Record<string, () => void> = {
  '[': () => api.resize(1 / 1.25),
  ']': () => api.resize(1.25),
  ' ': api.finish,
  enter: api.finish,
  escape: api.cancel,
  f: api.fitSelection,
  g: () => api.toggle('grid'),
  t: () => shade('textures'),
  w: () => shade('wireframe'),
  x: () => api.toggle('xray'),
}

type Held = 'hand' | 'shift'
const HELD: Record<string, Held> = { [MOD]: 'hand', Shift: 'shift' }

/** Space and Enter on a focused control press it, as they should. */
const CONTROL =
  'button, a, [role=button], [role=menuitem], [role=option], [role=switch], [role=slider], [role=checkbox]'

/** A held key changes what the pointer does; `data-hand` and friends let CSS show it. */
function hold(key: Held, down: boolean) {
  if (view[key] === down) return
  view[key] = down
  document.body.toggleAttribute(`data-${key}`, down)
  api.held()
}

/** Figma-style single-key shortcuts; ignored while typing. */
export function useShortcuts() {
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'Shift') hold('shift', true)
      if ((e.target as HTMLElement).closest('input, textarea, [role=dialog]'))
        return
      if (e.key === MOD) return hold('hand', true)
      // ⌘ or Ctrl plus another key is a shortcut, not a hold to move.
      if (isMac ? e.metaKey : e.ctrlKey) hold('hand', false)
      const key = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        e.preventDefault()
        return e.shiftKey ? api.redo() : api.undo()
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (
        (key === ' ' || key === 'enter') &&
        (e.target as HTMLElement).closest(CONTROL)
      )
        return
      if (key === ' ') e.preventDefault()
      if (/^Digit[1-9]$/.test(e.code)) {
        // The physical number row, so AZERTY's & é " … pick classes too.
        const cls = doc.get().classes[+e.code.slice(5) - 1]
        if (cls) api.selectClass(cls.id)
      } else if (TOOLS[key]) api.setTool(TOOLS[key])
      else ACTIONS[key]?.()
    }
    const up = (e: KeyboardEvent) => HELD[e.key] && hold(HELD[e.key], false)
    // Switching tabs mid-press never delivers the keyup.
    const blur = () => Object.values(HELD).forEach((key) => hold(key, false))
    const controller = new AbortController()
    const { signal } = controller
    window.addEventListener('keydown', down, { signal })
    window.addEventListener('keyup', up, { signal })
    window.addEventListener('blur', blur, { signal })
    return () => controller.abort()
  }, [])
}
