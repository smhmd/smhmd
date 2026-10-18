import { useEffect, useRef } from 'react'

import { api } from '../api'
import { rect } from '../common'
import { MOD } from '../platform'
import { ui } from '../state'
import { tools } from '../tools'
import { onGizmo, view } from '../view'

type Gesture = {
  id: number
  x: number
  y: number
  t: number
  alt: boolean
  /** The last pointer position, to move the box by. */
  last: readonly [number, number]
  /** Space held mid-drag: the box moves instead of resizing, as in Photoshop. */
  moving: boolean
}

const LONG_PRESS = 500 // ms; a long press is the touch screen's Alt- or Shift-click
const CLICK = 6 // px a click may wander

/** Parks the cursor overlay off-canvas. */
export const AWAY = '-9999px -9999px'

const local = (e: React.PointerEvent) => {
  const r = e.currentTarget.getBoundingClientRect()
  return [e.clientX - r.left, e.clientY - r.top] as const
}

const current = () => tools[ui.get().tool]

/**
 * Turns pointer events on the stage into the active tool's press, drag and
 * release. A left-drag acts; the hand (⌘ or Ctrl), the right button, two fingers or a tool
 * without a gesture navigate. Scroll resizes a sized tool's ring. Reads tool
 * state at event time, so the stage never re-renders.
 *
 * `ring` follows the pointer (the brush ring, Smart Select's guides); `draft`
 * is the box being dragged.
 */
export function useGestures() {
  const stage = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const draft = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)

  function end() {
    gesture.current = null
    if (draft.current) draft.current.hidden = true
  }

  // Mid-drag, shortcuts wait: switching tools, undoing or grabbing the hand
  // halfway through a stroke would leave it half done. Esc cancels the drag
  // itself (the box, or the stroke so far), and Space moves a box, as in
  // Photoshop. Shift still registers, so Fill can switch to whole pieces.
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const g = gesture.current
      const modifier = ['Shift', 'Alt', 'Meta', 'Control'].includes(e.key)
      if (!g || (modifier && e.key !== MOD)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (e.code === 'Space')
        g.moving = current().gesture === 'box' && e.type === 'keydown'
      else if (e.key === 'Escape' && e.type === 'keydown') {
        api.abort()
        end()
      }
    }
    window.addEventListener('keydown', key, true)
    window.addEventListener('keyup', key, true)
    return () => {
      window.removeEventListener('keydown', key, true)
      window.removeEventListener('keyup', key, true)
    }
  }, [])

  // Zooming takes the hand, a tool without a ring or a pinch. Captured here,
  // before the orbit controls on the canvas see it.
  useEffect(() => {
    const element = stage.current!
    function wheel(e: WheelEvent) {
      const canvas = e.target instanceof HTMLCanvasElement
      if (!canvas || !current().sized || view.hand || e.ctrlKey) return
      e.preventDefault()
      e.stopPropagation()
      // Shift-scroll arrives as a horizontal scroll on macOS.
      api.resize(Math.exp(-(e.deltaY || e.deltaX) / 400))
    }
    element.addEventListener('wheel', wheel, { capture: true, passive: false })
    return () => element.removeEventListener('wheel', wheel, { capture: true })
  }, [])

  function onPointerDownCapture(e: React.PointerEvent) {
    if (!(e.target instanceof HTMLCanvasElement)) return // overlay buttons
    if (gesture.current) {
      // A second finger: it was a navigation gesture after all.
      api.abort()
      return end()
    }
    const [x, y] = local(e)
    // The gizmo navigates, whatever the tool: a tap turns the camera, a drag orbits.
    if (view.hand || e.button !== 0 || !current().gesture || onGizmo(x, y))
      return
    gesture.current = {
      id: e.pointerId,
      x,
      y,
      t: e.timeStamp,
      alt: e.altKey,
      last: [x, y],
      moving: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    api.press(x, y)
  }

  function onPointerMove(e: React.PointerEvent) {
    const [x, y] = local(e)
    const g = gesture.current
    // Over the floating controls the ring stays put, so dragging the size slider grows it in place.
    if (!g && !(e.target instanceof HTMLCanvasElement)) return
    if (!g && onGizmo(x, y)) return onPointerLeave()
    if (ring.current) {
      ring.current.style.translate = `${x}px ${y}px`
      // Only a hovering pointer or the tool's own drag shows it: a second
      // finger, a drag from the gizmo or a right-drag navigates instead.
      ring.current.hidden = e.buttons !== 0 && g?.id !== e.pointerId
    }
    if (!g && e.buttons === 0) api.hover(x, y)
    if (g?.id !== e.pointerId) return
    if (g.moving) {
      g.x += x - g.last[0]
      g.y += y - g.last[1]
    }
    g.last = [x, y]
    api.drag(x, y)
    if (current().gesture === 'box' && draft.current)
      if (Math.hypot(x - g.x, y - g.y) > CLICK) {
        Object.assign(draft.current.style, rect([g.x, g.y, x, y]))
        draft.current.hidden = false
      }
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = gesture.current
    if (g?.id !== e.pointerId) return
    end()
    const [x, y] = local(e)
    api.release(x, y, {
      click: Math.hypot(x - g.x, y - g.y) <= CLICK,
      long: e.timeStamp - g.t >= LONG_PRESS,
      alt: g.alt,
      from: [g.x, g.y],
    })
  }

  function onPointerCancel() {
    if (gesture.current) api.abort()
    end()
  }

  function onPointerLeave() {
    if (ring.current) ring.current.style.translate = AWAY
    api.leave()
  }

  return {
    stage,
    ring,
    draft,
    handlers: {
      onPointerDownCapture,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave,
    },
  }
}
