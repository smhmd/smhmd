import clsx from 'clsx'
import { MotionConfig, motion } from 'motion/react'

import { api, ui, useMod } from '../lib'
import { TOOLS } from './tools'

const LOADING = {
  loading: 'Loading Smart Select',
  error: 'Smart Select unavailable · use the brush or Fill',
}

/** One line that always says what the current tool does next. */
function useHint(): [string, string] {
  const tool = ui.use((s) => s.tool)
  const status = ui.use((s) => s.status)
  const selecting = ui.use((s) => s.selecting)

  const { mod } = useMod()
  const hint = TOOLS[tool].hint
  if (hint) return hint(mod)
  if (status === 'loading' || status === 'error')
    return [LOADING[status], LOADING[status]]
  // Moving and encoding are one wait to the user: until the view is ready to click.
  if (status === 'moving' || status === 'encoding')
    return ['Analyzing view…', 'Analyzing view…']
  if (selecting)
    return [
      'Click to add · ⌥-click to exclude',
      'Tap to add · long-press to exclude',
    ]
  return [
    'Drag a box or click an object · ⌥-click to exclude',
    'Drag a box or tap an object · long-press to exclude',
  ]
}

/** A spring like iOS's: quick, with a hint of overshoot as the island grows or shrinks. */
const spring = { type: 'spring', bounce: 0.25, duration: 0.45 } as const

/**
 * The status, as an island like iOS's Dynamic Island but at the bottom: a
 * black capsule that grows to fit what it says, and makes room for Apply and
 * Cancel mid-selection.
 */
export function Status() {
  const [fine, coarse] = useHint()
  const status = ui.use((s) => s.status)
  const smart = ui.use((s) => s.tool === 'smart')
  const selecting = ui.use((s) => s.selecting)
  const progress = ui.use((s) => Math.round(s.progress * 100))
  const busy = smart && status !== 'ready' && status !== 'error'

  return (
    <MotionConfig transition={spring} reducedMotion='user'>
      <motion.div
        layout
        aria-live='polite'
        // In style, so the corners stay round while the size animates.
        style={{ borderRadius: 999 }}
        className={clsx(
          'absolute flex max-w-[calc(100%-2rem)] items-center gap-2 overflow-hidden bg-black py-1.5 pl-3.5 text-xs text-neutral-200 shadow-lg shadow-black/40',
          selecting ? 'pr-1.5' : 'pr-3.5',
          'max-lg:bottom-20 max-lg:right-4 sm:max-lg:left-1/2 sm:max-lg:right-auto sm:max-lg:-translate-x-1/2',
          'lg:bottom-3 lg:left-1/2 lg:-translate-x-1/2',
        )}>
        <motion.span
          layout='position'
          className={clsx(
            'size-1.5 shrink-0 rounded-full',
            busy
              ? 'animate-pulse bg-amber-400'
              : status === 'error'
                ? 'bg-red-500'
                : 'bg-green-400',
          )}
        />
        {/* Keyed by what it says, so new words fade in as the island resizes. */}
        <motion.span
          key={fine}
          layout='position'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className='truncate'>
          <span className='pointer-coarse:hidden'>{fine}</span>
          <span className='pointer-fine:hidden'>{coarse}</span>
        </motion.span>
        {status === 'loading' && (
          <motion.span
            layout='position'
            className='tabular-nums text-neutral-500'>
            {progress}%
          </motion.span>
        )}
        {/* Labels are already applied live; these close the selection out, either way. */}
        {selecting && (
          <motion.span
            layout='position'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='flex shrink-0 gap-1'>
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
              Apply <kbd className={clsx(kbd, 'text-neutral-500')}>space</kbd>
            </button>
          </motion.span>
        )}
      </motion.div>
    </MotionConfig>
  )
}

const pill =
  'h-6 cursor-pointer rounded-full px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-white/40'
const kbd = 'font-sans text-neutral-500 pointer-coarse:hidden'
