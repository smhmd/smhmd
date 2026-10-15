import { useRef } from 'react'

import clsx from 'clsx'

import { Download, Upload } from 'src/icons'

import { api } from '../lib'
import { Toolbar } from './Toolbar'
import { glass, Tip } from './ui'

const action = clsx(
  'flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg text-xs transition-colors lg:h-8 lg:px-3',
  'hocus:bg-white/8 hocus:text-white text-neutral-300',
  'outline-none focus-visible:ring-2 focus-visible:ring-white/40',
  '[&_svg]:size-5 [&_svg]:fill-current',
)

/** A top bar on large screens; on phones its pieces float over the canvas instead. */
export function Header() {
  const input = useRef<HTMLInputElement>(null)

  return (
    <header className='max-lg:contents lg:col-start-2 lg:row-start-1 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center'>
      <span />
      <Toolbar />
      <div
        className={clsx(
          glass,
          'flex items-center gap-1 justify-self-end',
          'max-lg:absolute max-lg:right-3 max-lg:top-3 max-lg:rounded-2xl max-lg:p-1.5',
        )}>
        <input
          ref={input}
          type='file'
          accept='.glb,.gltf,.obj,.ply,.stl'
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void api.open(file)
            e.target.value = ''
          }}
        />
        <Tip label='Open a mesh' keys='GLB · OBJ · PLY · STL'>
          <button
            type='button'
            aria-label='Open a mesh'
            onClick={() => input.current?.click()}
            className={action}>
            <Upload aria-hidden className='lg:hidden' />
            <span className='max-lg:sr-only'>Open</span>
          </button>
        </Tip>
        <Tip label='Per-vertex PLY + meta.json' keys='for Supervisely'>
          <button
            type='button'
            aria-label='Export'
            onClick={api.export}
            className={clsx(
              action,
              'lg:hocus:bg-neutral-200 lg:hocus:text-neutral-950 lg:bg-white lg:font-medium lg:text-neutral-950',
            )}>
            <Download aria-hidden className='lg:hidden' />
            <span className='max-lg:sr-only'>Export</span>
          </button>
        </Tip>
      </div>
    </header>
  )
}
