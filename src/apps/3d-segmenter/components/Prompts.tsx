import clsx from 'clsx'

import { prompts, rect } from '../lib'

export const BOX =
  'pointer-events-none absolute rounded-sm border border-dashed'

/** Smart Select's box and points, as last sent to the model. */
export function Prompts() {
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
