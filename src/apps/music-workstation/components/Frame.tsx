import clsx from 'clsx'

type FrameProps = React.ComponentProps<'div'>

export function Frame({ children, className, ...props }: FrameProps) {
  return (
    <div
      id='frame'
      className={clsx(
        'bg-frame shadow-frame rounded-3.5xl relative flex justify-center py-5 pl-5',
        'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform',
        'w-[1446px] origin-center',
        className,
      )}
      {...props}>
      <div
        className={clsx(
          'aspect-17/6 bg-keyboard rounded-ml grow',
          'grid-cols-34 gap-0.75 p-0.75 grid grid-rows-12',
        )}>
        {children}
      </div>

      <div className='pb-5.5 flex grid-rows-3 flex-col items-center px-4 pt-9'>
        <div
          data-name='mic-hole'
          className='size-1.25 bg-mic mb-28 rounded-full blur-[0.30px]'
        />

        <div data-name='volume-meter' className='flex grow'>
          <div className='pt-8.5 border-meter-over-limits mr-0.5 h-px w-5 border-b' />
          <div className='rounded-2.5xl bg-meter w-0.75 flex h-fit flex-col gap-y-1'>
            {Array.from({ length: 13 }).map((_, i) => (
              <div key={i} className='h-1.25 rounded-2.5xl bg-meter-tick' />
            ))}
          </div>
          <div className='pt-8.5 border-meter-over-limits ml-0.5 h-px w-5 border-b' />
        </div>

        <div
          data-name='product-name'
          className='font-roboto text-product-name flex flex-col items-center gap-y-3.5 justify-self-end'>
          <div className='vertical-rl scale-[-1] text-4xl font-light'>SM-1</div>
          <div className='rounded-ms border-product-name border px-1.5 py-0.5 text-xs'>
            field
          </div>
        </div>
      </div>

      <div
        data-name='tint'
        className='rounded-3.5xl bg-tint pointer-events-none absolute inset-0 z-50 mix-blend-soft-light'
      />

      <div
        data-name='power-button'
        className='w-4.5 h-12.5 bg-power-button-border absolute bottom-20 left-full rounded-r-md'>
        <div className='bg-power-button absolute inset-y-0 left-px right-px rounded-r-md' />
        <div className='bg-power-button-tint absolute inset-0 rounded-r-md' />
      </div>
    </div>
  )
}
