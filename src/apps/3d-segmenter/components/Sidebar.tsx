import { useState } from 'react'

import { Accordion } from '@base-ui/react/accordion'
import clsx from 'clsx'

import { useWide } from '../lib'
import { AppIcon } from '../metadata'
import { Classes } from './Classes'
import { Parts } from './Parts'
import { glass, Reveal } from './ui'

/**
 * Classes and Parts. Docked on large screens, both open; on phones a floating
 * card where they fold, one open at a time, or both away to clear the view.
 */
export function Sidebar() {
  const wide = useWide()
  // Both folded at first, so the model is in full view.
  const [open, setOpen] = useState<string[]>([])

  return (
    <aside
      className={clsx(
        glass,
        'flex flex-col',
        'max-lg:absolute max-lg:left-3 max-lg:top-3 max-lg:w-56',
        'lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:min-h-0',
      )}>
      <div className='flex h-12 shrink-0 items-center gap-2 px-3 max-lg:hidden'>
        <AppIcon
          aria-hidden
          className='size-5 rounded-md'
          transparent
          padding={7}
        />
        <h1 className='text-[13px] font-medium'>3D Segmenter</h1>
      </div>
      <Accordion.Root
        value={wide ? ['classes', 'parts'] : open}
        onValueChange={setOpen}
        multiple={wide}
        disabled={wide}
        className='flex min-h-0 flex-col lg:flex-1'>
        <Reveal value={(value) => setOpen([value])}>
          <Classes />
          <Parts />
        </Reveal>
      </Accordion.Root>
    </aside>
  )
}
