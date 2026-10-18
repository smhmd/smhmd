import clsx from 'clsx'

import { AppIcon } from '../metadata'
import { About } from './About'
import { Classes } from './Classes'
import { Parts } from './Parts'
import { glass } from './ui'

export function Sidebar() {
  return (
    <aside
      className={clsx(
        glass,
        'flex flex-col',
        'max-lg:absolute max-lg:left-3 max-lg:top-3 max-lg:w-56 max-lg:rounded-2xl',
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
      <Classes />
      <Parts />
      {/* On large screens the footer lives in the right panel, clear of the app drawer button. */}
      <About className='lg:hidden' />
    </aside>
  )
}
