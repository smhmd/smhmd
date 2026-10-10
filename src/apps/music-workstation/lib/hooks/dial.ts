import { useRef, useState } from 'react'

import { PI, TAU } from 'src/lib/math'

const STEP = 1 / 48 // one arrow-key nudge, in turns

const angle = (e: React.PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  return Math.atan2(
    e.clientY - r.top - r.height / 2,
    e.clientX - r.left - r.width / 2,
  )
}

/**
 * An endless rotary encoder. Drag around it, scroll over it, or use the
 * arrow keys; it only reports how far it turned (+1 = one clockwise turn).
 * Whoever listens owns the value, its range and its clamping.
 */
export function useDial(onChange?: (delta: number) => void) {
  const [rotation, setRotation] = useState(0)
  const last = useRef<number | null>(null)

  const turn = (delta: number) => {
    setRotation((r) => r + delta * 360)
    onChange?.(delta)
  }
  const release = () => void (last.current = null)

  const handlers = {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      e.currentTarget.setPointerCapture(e.pointerId)
      last.current = angle(e)
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      if (last.current === null) return
      const a = angle(e)
      let delta = a - last.current
      if (delta > PI) delta -= TAU // crossed the ±180° seam
      if (delta < -PI) delta += TAU
      last.current = a
      turn(delta / TAU)
    },
    onPointerUp: release,
    onPointerCancel: release,
    onWheel(e: React.WheelEvent) {
      turn(-e.deltaY / 1500)
    },
    onKeyDown(e: React.KeyboardEvent) {
      const dir = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[
        e.key
      ]
      if (!dir) return
      e.preventDefault()
      turn(dir * STEP)
    },
  }

  return { rotation, handlers }
}
