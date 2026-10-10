import clsx from 'clsx'

import type { SVGIcon } from 'src/lib/types'

import { Base } from './Base'

type ButtonProps = React.ComponentProps<'button'> & {
  variant?: keyof typeof SPAN
  /** A black key: a dark disc set in a light collar. */
  black?: boolean
  /** Accessible name; printed on the cap when there's no icon. */
  text?: string
  icon?: SVGIcon
  /** Latched state (selected sound, running transport…). */
  active?: boolean
}

// [cell footprint on the deck grid, where the cap sits inside it]
const SPAN = {
  middle: ['col-span-2 row-span-2 aspect-square', 'justify-center'],
  right: ['col-span-3 row-span-2', 'justify-end'],
  left: ['col-span-3 row-span-2', 'justify-start'],
  vertical: ['col-span-2 row-span-4', 'justify-center'],
}

export function Button({
  variant = 'middle',
  black,
  text,
  icon: Icon,
  active,
  className,
  ...props
}: ButtonProps) {
  return (
    <Base className={clsx(SPAN[variant][0], className)}>
      <button
        aria-label={text}
        aria-pressed={active}
        className={clsx(
          'key flex cursor-pointer items-center p-2.5',
          SPAN[variant][1],
        )}
        {...props}>
        <span
          className={clsx(
            'cap',
            black && 'cap-black',
            variant === 'vertical' ? 'size-full' : 'aspect-square h-full',
          )}>
          {Icon ? <Icon aria-hidden /> : black ? null : text}
        </span>
      </button>
    </Base>
  )
}
