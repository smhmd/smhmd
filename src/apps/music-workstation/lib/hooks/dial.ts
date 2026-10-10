import { useCallback, useRef, useState } from 'react'

import { PI } from 'src/lib/math'

type UseDialProps = {
  /** Called with the rotation delta in turns (+1 = one full clockwise revolution). */
  onChange?(delta: number): void
}

// Calculate angle from center to pointer position
const calculateAngle = (
  event: MouseEvent | TouchEvent,
  element: HTMLElement,
): number => {
  const rect = element.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  let clientX: number, clientY: number

  if ('touches' in event && event.touches.length > 0) {
    clientX = event.touches[0].clientX
    clientY = event.touches[0].clientY
  } else if ('clientX' in event) {
    clientX = event.clientX
    clientY = event.clientY
  } else {
    return 0 // Fallback
  }

  const x = clientX - centerX
  const y = clientY - centerY

  return (Math.atan2(y, x) * (180 / PI) + 360) % 360
}

/**
 * An endless rotary encoder: the dial spins forever in either direction and
 * only reports how far it moved. Whoever listens (the store) owns the
 * value, its range, and its clamping.
 */
export function useDial({ onChange }: UseDialProps = {}) {
  const [rotation, setRotation] = useState(0)
  const dialRef = useRef<HTMLButtonElement>(null)
  const prevAngleRef = useRef<number | null>(null)

  const updateRotation = useCallback(
    (e: MouseEvent | TouchEvent): void => {
      if (!dialRef.current || prevAngleRef.current === null) return

      const currentAngle = calculateAngle(e, dialRef.current)
      let delta = currentAngle - prevAngleRef.current

      // Handle crossing the 0/360 boundary
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360

      setRotation((prev) => prev + delta)
      onChange?.(delta / 360)

      prevAngleRef.current = currentAngle
    },
    [onChange],
  )

  const startDragging = useCallback(
    (event: React.MouseEvent | React.TouchEvent): void => {
      event.preventDefault()
      if (!dialRef.current) return

      prevAngleRef.current = calculateAngle(
        event.nativeEvent as MouseEvent | TouchEvent,
        dialRef.current,
      )

      const handleMouseMove = (e: MouseEvent) => updateRotation(e)
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        updateRotation(e)
      }
      const endDragging = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', endDragging)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', endDragging)
        document.removeEventListener('touchcancel', endDragging)
        prevAngleRef.current = null
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', endDragging)
      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      })
      document.addEventListener('touchend', endDragging)
      document.addEventListener('touchcancel', endDragging)
    },
    [updateRotation],
  )

  return {
    ref: dialRef,
    drag: startDragging,
    rotation,
  }
}
