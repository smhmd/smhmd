import { useState } from 'react'

import { useProgress } from '@react-three/drei/core/Progress'
import clsx from 'clsx'

import { store } from '../lib/store'

export function Splash() {
  const { active, progress } = useProgress()
  const ready = store.use('ready')
  // `!active` guards the gap between loader batches, where progress reads
  // 100 while the EXR is still queued; `ready` covers the GPU work after.
  const done = !active && progress >= 100 && ready

  // Loading screen or curtain. Latched at mount: asked every render it also
  // flips at the end of a cold load, dropping the bar out mid-load.
  const [bar] = useState(() => !store.get().entered)

  return (
    <div
      aria-busy={!done}
      className={clsx(
        'fixed inset-0 z-50 grid place-items-center bg-black',
        'transition-opacity duration-700 ease-out',
        done ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}>
      <div className='flex w-48 flex-col items-center gap-4'>
        <span className='font-serif text-xs uppercase tracking-[0.4em] text-white/70'>
          Simo
        </span>

        {bar && (
          <>
            {/* The role belongs on the bar itself, not on the column. */}
            <div
              role='progressbar'
              aria-label='Loading scene'
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              className='h-px w-full bg-white/10'>
              <div
                className='h-full bg-white/60 transition-[width] duration-300 ease-out'
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className='font-serif text-sm tabular-nums text-white/40'>
              {Math.round(progress)}%
            </span>
          </>
        )}
      </div>
    </div>
  )
}
