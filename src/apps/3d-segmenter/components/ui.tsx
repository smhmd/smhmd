import { Slider } from '@base-ui/react/slider'
import { Tooltip } from '@base-ui/react/tooltip'
import clsx from 'clsx'

import type { Props } from 'src/lib/types'

/** Floating surfaces on phones; docked panels are flat on large screens. */
export const glass =
  'max-lg:border max-lg:border-white/8 max-lg:bg-neutral-900/80 max-lg:shadow-2xl max-lg:shadow-black/40 max-lg:backdrop-blur-xl'

export const button = clsx(
  'grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg lg:size-8',
  'hocus:bg-white/8 hocus:text-white text-neutral-400 transition-colors',
  'data-pressed:bg-white/12 data-pressed:text-white',
  'disabled:pointer-events-none disabled:opacity-30',
  'outline-none focus-visible:ring-2 focus-visible:ring-white/40',
  '*:size-5 *:fill-current lg:*:size-[18px]',
)

type TipProps = { label: string; keys?: string; children: React.ReactElement }

export function Tip({ label, keys, children }: TipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8} className='pointer-events-none'>
          <Tooltip.Popup className='flex items-center gap-2 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-100 shadow-lg ring-1 ring-white/10'>
            {label}
            {keys && <kbd className='font-sans text-neutral-500'>{keys}</kbd>}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

type IconButtonProps = Props<'button', { label: string; keys?: string }>

export function IconButton({
  label,
  keys,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Tip label={label} keys={keys}>
      <button
        type='button'
        aria-label={label}
        className={clsx(button, className)}
        {...props}
      />
    </Tip>
  )
}

/** Compact icon buttons for list rows. */
export const small = 'size-7! *:size-4!'

type RangeProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  vertical?: boolean
  onChange(value: number): void
}

/** A slightly sunken well and a raised, lit knob, for the brush size. */
const well =
  'rounded-md bg-black/30 p-0.5 shadow-[inset_0_1px_1px_rgb(0_0_0/0.5),0_1px_0_rgb(255_255_255/0.04)]'
const knob =
  'rounded bg-linear-to-b from-neutral-300 to-neutral-400 shadow-[0_1px_2px_rgb(0_0_0/0.5),inset_0_1px_0_rgb(255_255_255/0.5)]'

/** Procreate-style: a well with a short knob and no fill. */
export function Range({ label, vertical, onChange, ...props }: RangeProps) {
  return (
    <Slider.Root
      {...props}
      thumbAlignment='edge'
      orientation={vertical ? 'vertical' : 'horizontal'}
      onValueChange={(value) => onChange(value as number)}
      className='touch-none'>
      <Slider.Control
        className={clsx(
          well,
          'cursor-pointer data-[orientation=horizontal]:h-6 data-[orientation=vertical]:h-44 data-[orientation=vertical]:w-6',
        )}>
        <Slider.Track className='relative size-full'>
          <Slider.Thumb
            aria-label={label}
            className={clsx(
              knob,
              'hocus:brightness-110 outline-none focus-visible:ring-2 focus-visible:ring-white/50',
              'data-[orientation=horizontal]:h-full data-[orientation=horizontal]:w-4',
              'data-[orientation=vertical]:h-4 data-[orientation=vertical]:w-full',
            )}
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  )
}

type TrailingProps = {
  count: number
  pinned?: boolean
  children: React.ReactNode
}

/**
 * A list row's trailing slot: the vertex count at rest, the row's buttons on
 * hocus. `pinned` keeps the buttons up (e.g. a hidden item's eye). Touch
 * screens can't hover, so they show both side by side.
 */
export function Trailing({ count, pinned, children }: TrailingProps) {
  return (
    <span className='pointer-coarse:flex grid shrink-0 items-center justify-items-end *:col-start-1 *:row-start-1'>
      <span
        className={clsx(
          'px-1 tabular-nums text-neutral-500',
          pinned
            ? 'pointer-fine:invisible'
            : 'pointer-fine:group-hocus-within:invisible',
        )}>
        {count.toLocaleString()}
      </span>
      <span
        className={clsx(
          'flex',
          !pinned &&
            'pointer-fine:invisible pointer-fine:group-hocus-within:visible',
        )}>
        {children}
      </span>
    </span>
  )
}

type SectionProps = Props<
  'section',
  { title: string; unit?: string; action?: React.ReactNode }
>

export function Section({
  title,
  unit,
  action,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={clsx('flex min-h-0 flex-col', className)} {...props}>
      <header className='flex h-9 shrink-0 items-center justify-between pl-3 pr-1.5'>
        <h2 className='text-xs font-medium text-neutral-400'>
          {title}
          {unit && (
            <span className='font-normal text-neutral-500'> ({unit})</span>
          )}
        </h2>
        {action}
      </header>
      {children}
    </section>
  )
}
