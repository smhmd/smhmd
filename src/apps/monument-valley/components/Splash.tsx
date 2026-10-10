import { useProgress } from '@react-three/drei/core/Progress'
import clsx from 'clsx'

import type { Props } from 'src/lib/types'

import { useGame } from '../lib/hooks'

type OrnamentProps = Props<'svg'>

function Ornament(props: OrnamentProps) {
  return (
    <svg
      aria-hidden
      focusable='false'
      fill='none'
      viewBox='0 0 603 103'
      height={40}
      {...props}>
      <path
        stroke='#d4d4d4'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='2.5'
        d='M1 101h200l30-30 30 30 40-40m0 0 30-30-30-30-30 30zm0 0 40 40 30-30 30 30h200'
      />
    </svg>
  )
}

export function Splash() {
  const { progress } = useProgress() // TODO: figure out soft reload hydration problem (seen on Firefox)
  const ready = progress >= 100

  const started = useGame((s) => s.started)
  const ended = useGame((s) => s.ended)
  const start = useGame((s) => s.start)

  const visible = !started || ended

  return (
    <div
      inert={!visible} // disable all interactions
      className={clsx(
        'fixed inset-0',
        'duration-2000 transition-opacity',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        ended && 'delay-2000',
      )}>
      <div
        className={clsx(
          'fixed inset-0 bg-black',
          'duration-3000 transition-opacity',
          ready ? 'opacity-50' : 'delay-2000 opacity-100',
        )}
      />

      <div
        className={clsx(
          'fixed inset-0 py-16',
          'grid grid-rows-[1fr_auto_1fr] justify-items-center',
          'uppercase text-white',
        )}>
        <div className='row-start-2 flex flex-col items-center gap-y-12 text-center'>
          <Ornament />

          <div className='flex flex-col gap-y-4'>
            <p className='text-sm tracking-[0.3em]'>
              {ended && 'END OF'} CHAPTER I
            </p>
            <h1 className='text-4xl tracking-[0.12em] md:text-5xl'>
              MONUMENT VALLEY
            </h1>
          </div>

          <div className='h-px w-1/4 bg-neutral-300' />

          <p className='text-sm tracking-[0.3em]'>
            {ended
              ? 'In which Ida found the path'
              : 'In which Ida walks the path'}
          </p>

          <Ornament className='-scale-y-100' />
        </div>

        <div className='row-start-3 self-end text-sm tracking-[0.3em]'>
          {ended ? (
            <p className='p-6'>COMPLETE</p>
          ) : (
            <button
              aria-live='polite'
              disabled={!ready}
              onClick={start}
              className='cursor-[unset] p-6 focus:outline-none focus-visible:ring'>
              {ready ? 'START GAME' : 'LOADING...'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
