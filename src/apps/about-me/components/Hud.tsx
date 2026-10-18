import clsx from 'clsx'

import { isMobile } from 'src/lib/env'

import { dialogue } from '../lib/dialogue'
import { panel, store, useChoices } from '../lib/store'
import { Rows } from './Rows'

export function Hud() {
  const node = store.use('node')
  const entered = store.use('entered')
  const text = node && dialogue[node].text
  const choices = useChoices()

  const rows = choices && <Rows choices={choices} className='w-72' />

  return (
    <div className='relative z-0'>
      <div
        aria-hidden
        className='pointer-events-none fixed inset-0 z-50 size-full'
        style={{ filter: `url(#vignette)` }}
      />

      {!isMobile && (
        <div
          ref={panel}
          className='pointer-events-none fixed left-0 top-0 z-40'>
          {rows}
        </div>
      )}

      <div
        className={clsx(
          'pointer-events-none fixed inset-x-0 bottom-0 z-30',
          'bg-linear-to-t from-black/55 to-transparent',
          'transition-opacity duration-500',
          isMobile && choices ? 'h-72' : 'h-48', // taller when it has rows to cover
          text || choices ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        className={clsx(
          'pointer-events-none fixed inset-x-0 bottom-14 z-40 px-6',
          'flex flex-col items-center gap-5',
        )}>
        {text && (
          <div
            key={node} // remounts per line, so the enter transition replays
            className='starting:translate-y-1 starting:opacity-0 max-w-2xl text-center transition-all duration-300 ease-out'>
            <span className='text-shadow block font-serif text-sm uppercase tracking-[0.35em] text-amber-300/90'>
              Simo
            </span>
            <p className='mt-1 font-serif text-lg leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'>
              {text}
            </p>
          </div>
        )}

        {isMobile && rows}
      </div>

      {!node && entered && (
        <div className='pointer-events-none fixed inset-x-0 bottom-5 z-40 grid place-items-center'>
          <span className='starting:opacity-0 bg-linear-to-r from-transparent via-black/60 to-transparent px-10 py-1 font-serif text-sm tracking-wide text-white transition-opacity duration-500 ease-out'>
            Click Simo to talk
          </span>
        </div>
      )}
    </div>
  )
}
