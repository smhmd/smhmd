import clsx from 'clsx'

import { useDial } from '../lib'
import { Base } from './Base'

type ParameterProps = {
  variant: 'blue' | 'brown' | 'gray' | 'orange'
  /** Reports rotation deltas in turns; the store owns the value. */
  onChange?(delta: number): void
}

const variants = {
  border: {
    blue: 'bg-parameter-top-blue-border',
    brown: 'bg-parameter-top-brown-border',
    gray: 'bg-parameter-top-gray-border',
    orange: 'bg-parameter-top-orange-border',
  },
  bg: {
    blue: 'bg-parameter-top-blue',
    brown: 'bg-parameter-top-brown',
    gray: 'bg-parameter-top-gray',
    orange: 'bg-parameter-top-orange',
  },
} as const

export function Parameter({ variant, onChange }: ParameterProps) {
  const { rotation, handlers } = useDial(onChange)
  return (
    <Base className='**:aspect-square col-span-4 row-span-4 aspect-square'>
      <button
        className='cursor-grab active:cursor-grabbing'
        role='slider'
        aria-label={variant}
        {...handlers}>
        <div className='bg-parameter-bed absolute inset-8 rounded-full'>
          <div className='bg-parameter-base absolute inset-0.5 rounded-full'>
            <div className='bg-parameter-body-border inset-4.5 absolute rounded-full p-px'>
              <div className='bg-parameter-body size-full rounded-full'>
                <div
                  className={clsx(
                    variants.border[variant],
                    'absolute inset-1 rounded-full p-px',
                  )}>
                  <div
                    className={clsx(
                      variants.bg[variant],
                      'size-full rounded-full',
                    )}>
                    <div
                      className='absolute inset-0 flex justify-center p-1.5'
                      style={{ transform: `rotate(${rotation}deg)` }}>
                      <div
                        className='bg-volume-indicator absolute -ml-0.5 size-1.5 rounded-full opacity-40'
                        style={{ transform: `rotate(${-rotation}deg)` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
    </Base>
  )
}
