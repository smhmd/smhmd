import { useMemo, useRef } from 'react'

import { api, KEYS } from '../lib'
import { Button } from './Button'

export function Keyboard() {
  const isMouseDown = useRef(false)

  const handle = useMemo(
    () => ({
      click(note: string) {
        api.attackNote(note)
        isMouseDown.current = true
        const up = () => {
          document.removeEventListener('pointerup', up)
          document.removeEventListener('pointercancel', up)
          if (!isMouseDown.current) return
          api.releaseNote()
          isMouseDown.current = false
        }
        document.addEventListener('pointerup', up)
        document.addEventListener('pointercancel', up)
      },
      enter(note: string) {
        if (!isMouseDown.current) return
        api.releaseNote()
        api.attackNote(note)
      },
      leave() {
        if (!isMouseDown.current) return
        api.releaseNote()
      },
    }),
    [],
  )

  return (
    <div className='contents' role='group'>
      {KEYS.map(({ note, variant }) => {
        const isBlack = variant !== 'vertical'
        return (
          <Button
            // text={isBlack ? undefined : `${note[0]}\n${note[1]}`}
            key={note}
            aria-label={note}
            black={isBlack}
            variant={variant}
            // Pointer events fire on touch-down (mouse events only arrive
            // after the finger lifts). Touch implicitly captures the pointer
            // to the first key; releasing it lets a finger glide across keys.
            onPointerDown={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId)
              handle.click(note)
            }}
            onPointerEnter={() => {
              handle.enter(note)
            }}
            onPointerLeave={() => {
              handle.leave()
            }}
            // Keyboard activation (Enter/Space) — clicks from a pointer
            // have detail ≥ 1 and were already handled on pointer-down.
            onClick={(e) => {
              if (e.detail === 0) api.attackNote(note)
            }}
          />
        )
      })}
    </div>
  )
}
