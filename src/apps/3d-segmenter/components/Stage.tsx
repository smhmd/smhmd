import { lazy, Suspense, useEffect, useRef } from 'react'

import { Canvas } from '@react-three/fiber'
import clsx from 'clsx'

import { CenterFocus } from 'src/icons'

import { api, type Box, prompts, ui, view } from '../lib'
import { Rail } from './Rail'
import { Status } from './Status'
import { IconButton } from './ui'

const Scene = lazy(() => import('./Scene'))

type Gesture = {
  id: number
  x: number
  y: number
  t: number
  kind: 'stroke' | 'smart'
  alt: boolean
}

const LONG_PRESS = 500 // ms; a long press is the touch screen's Alt-click

const local = (e: React.PointerEvent) => {
  const r = e.currentTarget.getBoundingClientRect()
  return [e.clientX - r.left, e.clientY - r.top] as const
}

const controls = (enabled: boolean) => {
  if (view.controls) view.controls.enabled = enabled
}

/**
 * Every tool acts on a left-drag; Space, the right button, two fingers or the
 * Move tool navigate. Smart select: drag a box, click a point, Alt-click or
 * long-press a point that excludes.
 *
 * Reads tool state at event time, so this component never re-renders.
 */
export function Stage() {
  const stage = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const draft = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)

  // Esc mid-drag drops the box without also undoing the selection.
  useEffect(() => {
    function escape(e: KeyboardEvent) {
      if (e.key !== 'Escape' || gesture.current?.kind !== 'smart') return
      e.stopImmediatePropagation()
      end()
    }
    window.addEventListener('keydown', escape, true)
    return () => window.removeEventListener('keydown', escape, true)
  }, [])

  function end() {
    gesture.current = null
    if (draft.current) draft.current.hidden = true
    controls(true)
  }

  function onPointerDownCapture(e: React.PointerEvent) {
    if (!(e.target instanceof HTMLCanvasElement)) return // overlay buttons
    if (gesture.current) {
      // A second finger: it was a navigation gesture after all.
      if (gesture.current.kind === 'stroke') api.cancelStroke()
      return end()
    }
    const { tool } = ui.get()
    if (view.space || e.button !== 0 || tool === 'move') return
    const [x, y] = local(e)
    if (view.dirty) api.settle()
    const kind = tool === 'smart' ? 'smart' : 'stroke'
    gesture.current = {
      id: e.pointerId,
      x,
      y,
      t: e.timeStamp,
      kind,
      alt: e.altKey,
    }
    controls(false)
    e.currentTarget.setPointerCapture(e.pointerId)
    if (kind === 'stroke') api.startStroke(x, y)
  }

  function onPointerMove(e: React.PointerEvent) {
    const [x, y] = local(e)
    if (ring.current) ring.current.style.translate = `${x}px ${y}px`
    const g = gesture.current
    if (g?.id !== e.pointerId) return
    if (g.kind === 'stroke') return api.paint(x, y)
    if (draft.current && Math.hypot(x - g.x, y - g.y) > 6) {
      Object.assign(draft.current.style, rect([g.x, g.y, x, y]))
      draft.current.hidden = false
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = gesture.current
    if (g?.id !== e.pointerId) return
    end()
    if (g.kind === 'stroke') return api.endStroke()
    const [x, y] = local(e)
    if (Math.hypot(x - g.x, y - g.y) > 6)
      api.box([
        Math.min(g.x, x),
        Math.min(g.y, y),
        Math.max(g.x, x),
        Math.max(g.y, y),
      ])
    else api.tap(x, y, !g.alt && e.timeStamp - g.t < LONG_PRESS)
  }

  return (
    <div
      ref={stage}
      className='in-data-space:cursor-grab! absolute inset-0 overflow-hidden lg:relative lg:col-start-2 lg:row-start-2 lg:mb-2 lg:rounded-xl lg:bg-[#202020]'
      onPointerDownCapture={onPointerDownCapture}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={end}>
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 35, position: [1.6, 1.4, 2.6], near: 0.05, far: 20 }}
        gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Prompts />
      <div ref={draft} hidden className={clsx(BOX, 'border-white')} />
      <Cursor stage={stage} ring={ring} />
      <Status />
      <Rail />
      {/* Top-right of the canvas; on phones, below the Open/Export card. */}
      <IconButton
        label='Frame model'
        keys='F'
        onClick={() => api.frame()}
        className='absolute right-3 top-[4.5rem] bg-black/40 backdrop-blur-md lg:top-3'>
        <CenterFocus aria-hidden />
      </IconButton>
    </div>
  )
}

const BOX = 'pointer-events-none absolute rounded-sm border border-dashed'

const rect = ([x0, y0, x1, y1]: Box) => ({
  left: `${Math.min(x0, x1)}px`,
  top: `${Math.min(y0, y1)}px`,
  width: `${Math.abs(x1 - x0)}px`,
  height: `${Math.abs(y1 - y0)}px`,
})

function Prompts() {
  const { points, box } = prompts.use()
  return (
    <>
      {box && (
        <div className={clsx(BOX, 'border-white/70')} style={rect(box)} />
      )}
      {points.map(({ x, y, positive }, i) => (
        <span
          key={i}
          aria-hidden
          className={clsx(
            'pointer-events-none absolute -ml-2 -mt-2 grid size-4 place-items-center rounded-full border-2 border-white text-[10px] font-bold leading-none text-white shadow-md',
            positive ? 'bg-green-500' : 'bg-red-500',
          )}
          style={{ left: x, top: y }}>
          {positive ? '+' : '−'}
        </span>
      ))}
    </>
  )
}

const CURSORS = {
  move: 'grab',
  smart: 'crosshair',
  brush: 'crosshair',
  erase: 'crosshair',
}

/** The brush ring follows the pointer through a ref; this only re-renders when the tool or size changes. */
function Cursor({
  stage,
  ring,
}: {
  stage: React.RefObject<HTMLDivElement | null>
  ring: React.RefObject<HTMLDivElement | null>
}) {
  const tool = ui.use((s) => s.tool)
  const radius = ui.use((s) => s.radius)

  useEffect(() => {
    if (stage.current) stage.current.style.cursor = CURSORS[tool]
  }, [stage, tool])

  if (tool !== 'brush' && tool !== 'erase') return null
  return (
    <div
      ref={ring}
      aria-hidden
      className={clsx(
        'pointer-events-none absolute left-0 top-0 rounded-full border shadow-[0_0_0_1px_rgb(0_0_0/0.4)]',
        // Holding Space turns any tool into the hand, so the brush ring would lie.
        'in-data-space:hidden',
        tool === 'erase' ? 'border-dashed border-white' : 'border-white/80',
      )}
      style={{
        width: radius * 2,
        height: radius * 2,
        margin: -radius,
        translate: '-999px',
      }}
    />
  )
}
