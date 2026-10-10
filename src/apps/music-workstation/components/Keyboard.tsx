import { api, KEYS } from '../lib'
import { Button } from './Button'

export function Keyboard() {
  return KEYS.map(({ note, variant }) => (
    <Button
      key={note}
      aria-label={note}
      black={variant !== 'vertical'}
      variant={variant}
      // Pointer events fire on touch-down. Releasing the implicit touch
      // capture lets a held finger (or mouse) glide across the keys.
      onPointerDown={(e) => {
        const key = e.currentTarget
        if (key.hasPointerCapture(e.pointerId))
          key.releasePointerCapture(e.pointerId)
        api.attackNote(note)
      }}
      onPointerEnter={(e) => {
        if (e.buttons & 1) api.attackNote(note)
      }}
      // Keyboard activation; pointer clicks were handled on pointer-down.
      onClick={(e) => {
        if (e.detail === 0) api.attackNote(note)
      }}
    />
  ))
}
