import clsx from 'clsx'

import { api, ui } from '../lib'

const LOADING = {
  loading: 'Loading Smart Tool',
  error: 'Smart Tool unavailable · use the brush',
}

/** One line that always says what the current tool does next. */
function useHint(): [string, string] {
  const tool = ui.use((s) => s.tool)
  const status = ui.use((s) => s.status)
  const selecting = ui.use((s) => s.selecting)

  if (tool === 'move')
    return [
      'Drag to orbit · right-drag to pan · hold Space with any tool',
      'Drag to orbit · pinch to zoom',
    ]
  if (tool === 'brush')
    return [
      'Paint · hold Space or right-drag to orbit',
      'Paint · two fingers to orbit',
    ]
  if (tool === 'erase')
    return [
      'Erase · hold Space or right-drag to orbit',
      'Erase · two fingers to orbit',
    ]
  if (status === 'loading' || status === 'error')
    return [LOADING[status], LOADING[status]]
  // Moving and encoding are one wait to the user: until the view is ready to click.
  if (status === 'moving' || status === 'encoding')
    return ['Analyzing view…', 'Analyzing view…']
  if (selecting)
    return [
      'Click to add · ⌥-click to exclude · drag a new box',
      'Tap to add · long-press to exclude',
    ]
  return [
    'Drag a box or click an object · ⌥-click to exclude',
    'Drag a box or tap an object · long-press to exclude',
  ]
}

export function Status() {
  const [fine, coarse] = useHint()
  const status = ui.use((s) => s.status)
  const smart = ui.use((s) => s.tool === 'smart')
  const selecting = ui.use((s) => s.selecting)
  const progress = ui.use((s) => Math.round(s.progress * 100))
  const busy = smart && status !== 'ready' && status !== 'error'

  return (
    <div
      aria-live='polite'
      className={clsx(
        'absolute flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-black/60 py-1 pl-3 text-xs text-neutral-300 backdrop-blur-md',
        selecting ? 'pr-1' : 'pr-3',
        'max-lg:bottom-20 max-lg:right-4 sm:max-lg:left-1/2 sm:max-lg:right-auto sm:max-lg:-translate-x-1/2',
        'lg:bottom-3 lg:left-1/2 lg:-translate-x-1/2',
      )}>
      <span
        className={clsx(
          'size-1.5 shrink-0 rounded-full',
          busy
            ? 'animate-pulse bg-amber-400'
            : status === 'error'
              ? 'bg-red-500'
              : 'bg-green-400',
        )}
      />
      <span className='truncate'>
        <span className='pointer-coarse:hidden'>{fine}</span>
        <span className='pointer-fine:hidden'>{coarse}</span>
      </span>
      {status === 'loading' && (
        <span className='tabular-nums text-neutral-500'>{progress}%</span>
      )}
      {/* Labels are already applied live; these close the selection out, either way. */}
      {selecting && (
        <span className='flex shrink-0 gap-1'>
          <button
            type='button'
            onClick={api.cancel}
            className={clsx(pill, 'hocus:bg-white/10')}>
            Cancel <kbd className={kbd}>esc</kbd>
          </button>
          <button
            type='button'
            onClick={api.finish}
            className={clsx(
              pill,
              'hocus:bg-neutral-200 bg-white font-medium text-neutral-950',
            )}>
            Apply <kbd className={clsx(kbd, 'text-neutral-500')}>↵</kbd>
          </button>
        </span>
      )}
    </div>
  )
}

const pill =
  'h-6 cursor-pointer rounded-full px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-white/40'
const kbd = 'font-sans text-neutral-500 pointer-coarse:hidden'
