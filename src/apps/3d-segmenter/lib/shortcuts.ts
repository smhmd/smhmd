import { useEffect } from 'react'

import type { Tool } from './common'
import { api, doc, ui } from './store'
import { view } from './view'

const TOOLS: Record<string, Tool> = {
  v: 'move',
  s: 'smart',
  b: 'brush',
  e: 'erase',
}

const ACTIONS: Record<string, () => void> = {
  '[': () => api.setRadius(ui.get().radius - 4),
  ']': () => api.setRadius(ui.get().radius + 4),
  enter: api.finish,
  escape: api.cancel,
  f: () => api.frame(),
  g: () => api.toggle('grid'),
  t: () => api.toggle('textures'),
  w: () => api.toggle('wireframe'),
}

/** Held Space: every tool orbits, and the cursor says so (see Stage's `in-data-space`). */
function hand(held: boolean) {
  view.space = held
  document.body.toggleAttribute('data-space', held)
}

/** Figma-style single-key shortcuts; ignored while typing. */
export function useShortcuts() {
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input, textarea, [role=dialog]'))
        return
      const key = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        e.preventDefault()
        return e.shiftKey ? api.redo() : api.undo()
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === 'Space') {
        e.preventDefault()
        hand(true)
      } else if (/^Digit[1-9]$/.test(e.code)) {
        // The physical number row, so AZERTY's & é " … pick classes too.
        const cls = doc.get().classes[+e.code.slice(5) - 1]
        if (cls) api.selectClass(cls.id)
      } else if (TOOLS[key]) api.setTool(TOOLS[key])
      else ACTIONS[key]?.()
    }
    const up = (e: KeyboardEvent) => e.code === 'Space' && hand(false)
    // Switching tabs mid-press never delivers the keyup.
    const blur = () => hand(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])
}
