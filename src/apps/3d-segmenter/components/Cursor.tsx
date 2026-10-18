import { useEffect } from 'react'

import clsx from 'clsx'

import { AWAY, tools, ui, view } from '../lib'
import { TOOLS } from './tools'

type CursorProps = {
  stage: React.RefObject<HTMLDivElement | null>
  ring: React.RefObject<HTMLDivElement | null>
}

/**
 * The brush ring, or Smart Select's guides, follow the pointer through a ref;
 * this only re-renders when the tool or size changes.
 */
export function Cursor({ stage, ring }: CursorProps) {
  const tool = ui.use('tool')
  const radius = ui.use('radius')
  const { gesture } = tools[tool]
  const look = TOOLS[tool].ring
  // Switching tools with the keyboard: the new ring starts where the pointer already is.
  const at = view.pointer ? `${view.pointer[0]}px ${view.pointer[1]}px` : AWAY

  useEffect(() => {
    stage.current!.style.cursor = gesture ? 'crosshair' : 'grab'
  }, [stage, gesture])

  // Full-width guides to line a box's edges up with the object's extremes.
  if (gesture === 'box')
    return (
      <div
        ref={ring}
        aria-hidden
        className={clsx(
          'in-data-hand:hidden pointer-coarse:hidden pointer-events-none absolute left-0 top-0',
          'before:absolute before:-left-[200vw] before:w-[400vw] before:border-t before:border-dashed before:border-white/30',
          'after:absolute after:-top-[200vh] after:h-[400vh] after:border-l after:border-dashed after:border-white/30',
        )}
        style={{ translate: at }}
      />
    )
  if (!look) return null
  return (
    <div
      ref={ring}
      aria-hidden
      className={clsx(
        'pointer-events-none absolute left-0 top-0 rounded-full border shadow-[0_0_0_1px_rgb(0_0_0/0.4)]',
        // Holding Ctrl turns any tool into the hand, so the ring would lie.
        'in-data-hand:hidden',
        look,
      )}
      style={{
        width: radius * 2,
        height: radius * 2,
        margin: -radius,
        translate: at,
      }}
    />
  )
}
