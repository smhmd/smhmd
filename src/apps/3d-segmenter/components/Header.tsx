import clsx from 'clsx'

import { Actions } from './Actions'
import { Toolbar } from './Toolbar'
import { glass } from './ui'
import { ViewMenu } from './View'

/** The toolbar on large screens; on phones the tools float at the bottom, and View, Open and Export top right. */
export function Header() {
  return (
    <header className='max-lg:contents lg:col-start-2 lg:row-start-1 lg:flex lg:items-center lg:justify-center'>
      <Toolbar />
      <div
        className={clsx(
          glass,
          'absolute right-3 top-3 flex gap-1 p-1 lg:hidden',
        )}>
        <ViewMenu />
        <Actions />
      </div>
    </header>
  )
}
