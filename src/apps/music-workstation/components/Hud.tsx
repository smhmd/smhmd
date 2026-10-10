import clsx from 'clsx'

import { MODE_GLYPHS } from '../icons'
import { COLORS, type Mode } from '../lib'

/**
 * The readout band along the top of every screen. Fixed height, normal flow —
 * the graphics area below can never collide with it.
 */
export function Hud({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={clsx(
        // Reads like justify-between — first and last readouts at the edges,
        // the middle two centered in their quarters — but on a fixed grid, so
        // a value growing from "+1" to "+10" never nudges a neighbour.
        'grid h-11 shrink-0 grid-cols-4 items-center justify-items-center px-4 *:first:justify-self-start *:last:justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

/** A small uppercase caption, OP-1 Field style. */
export function Label({ children }: { children: React.ReactNode }) {
  return (
    // The negative margin cancels the tracking after the last letter, which
    // would otherwise leave every caption visibly off-center.
    <span className='-mr-[0.25em] text-[9px] uppercase leading-none tracking-[0.25em] opacity-60'>
      {children}
    </span>
  )
}

/** One readout: a big thin value with its caption. */
export function Item({
  label,
  color,
  children,
}: {
  label?: string
  color?: string
  children: React.ReactNode
}) {
  return (
    <div className='flex items-baseline gap-2' style={{ color }}>
      <span className='text-2xl font-thin tabular-nums leading-none'>
        {children}
      </span>
      {label ? <Label>{label}</Label> : null}
    </div>
  )
}

/** The orange readout: which way the sequence walks. */
export function ModeMark({ mode }: { mode: Mode }) {
  const Glyph = MODE_GLYPHS[mode]
  return (
    <span className='text-4xl' style={{ color: COLORS.orange }}>
      <Glyph role='img' aria-label={mode} strokeWidth={2} />
    </span>
  )
}
