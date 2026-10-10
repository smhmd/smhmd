import clsx from 'clsx'

import { store, useDial } from '../lib'
import { Base } from './Base'

type VolumeProps = {
  /** Reports rotation deltas in turns; the store owns the value. */
  onChange?(delta: number): void
  onMute?(): void
}

export function Volume({ onChange, onMute }: VolumeProps) {
  const { rotation, handlers } = useDial(onChange)
  const muted = store.use(({ muted }) => muted)

  return (
    <Base className='col-span-2 row-span-4 grid-rows-2'>
      <button
        role='slider'
        aria-label='volume'
        className='relative aspect-square cursor-grab active:cursor-grabbing'
        {...handlers}
        style={{ touchAction: 'none' }}>
        <div className='bg-volume-base absolute inset-2.5 rounded-full'>
          <div className='bg-volume-body-border absolute inset-0.5 rounded-full p-px'>
            <div className='bg-volume-body size-full rounded-full'>
              <div className='bg-volume-top-border absolute inset-1.5 rounded-full p-px'>
                <div className='bg-volume-top size-full rounded-full'>
                  <div
                    className='absolute inset-0 flex justify-center p-1.5'
                    style={{ transform: `rotate(${rotation}deg)` }}>
                    <div
                      className='bg-volume-indicator absolute -ml-0.5 size-1.5 rounded-full'
                      style={{ transform: `rotate(${-rotation}deg)` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>

      <button
        aria-label='mute'
        aria-pressed={muted}
        onClick={onMute}
        className='relative aspect-square size-full cursor-pointer'>
        <div className='bg-bump-mute blur-px absolute inset-2.5 rounded-[11px]' />
        <div className='z-1 absolute inset-4'>
          <div
            className={clsx(
              'bg-mute size-full rounded-md transition-transform',
              muted && 'scale-90 brightness-95',
            )}
          />
        </div>
      </button>
    </Base>
  )
}
