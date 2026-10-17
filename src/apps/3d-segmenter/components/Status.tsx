import { useEffect, useState } from 'react'

import clsx from 'clsx'
import { MotionConfig, motion } from 'motion/react'

import { api, prompts, ui, useMod } from '../lib'
import { TOOLS } from './tools'

type Tone = 'ok' | 'busy' | 'error'
type Line = { tone: Tone; text: string; touch?: string; retry?: boolean }

const mb = (bytes: number) => Math.round(bytes / 1e6)

/** Whether `on` has held for a moment, so states that pass quickly never flash. */
function useLasting(on: boolean, ms = 500) {
  const [lasting, setLasting] = useState(false)
  useEffect(() => {
    setLasting(false)
    if (!on) return
    const timer = setTimeout(() => setLasting(true), ms)
    return () => clearTimeout(timer)
  }, [on, ms])
  return on && lasting
}

/** One line that always says what's happening, or what the current tool does next. */
function useLine(): Line {
  const tool = ui.use((s) => s.tool)
  const status = ui.use((s) => s.status)
  const selecting = ui.use((s) => s.selecting)
  const notice = ui.use((s) => s.notice)
  const opening = ui.use((s) => s.opening)
  const waiting = prompts.use((s) => !!s.box || s.points.length > 0)
  // Clicks made meanwhile queue behind it, so it's only worth saying when it's slow.
  const analyzing = useLasting(status === 'encoding')
  const { mod } = useMod()
  const hint = TOOLS[tool].hint?.(mod)
  // The first load is one wait (the sample, the download, starting up, the
  // first view), so it reads as one line instead of flickering through each.
  const loading = !hint && status === 'loading'

  if (notice) return { tone: 'error', text: notice }
  if (loading)
    return {
      tone: 'busy',
      text: waiting
        ? 'Selecting once Smart Select is ready'
        : 'Loading Smart Select',
    }
  if (opening) return { tone: 'busy', text: `Opening ${opening}…` }
  if (hint) return { tone: 'ok', text: hint[0], touch: hint[1] }
  if (status === 'error')
    return { tone: 'error', text: 'Smart Select couldn’t load', retry: true }
  if (analyzing) return { tone: 'busy', text: 'Analyzing view…' }
  if (selecting)
    return {
      tone: 'ok',
      text: 'Click to add · ⌥-click to exclude',
      touch: 'Tap to add · long-press to exclude',
    }
  return {
    tone: 'ok',
    text: 'Drag a box or click an object · ⌥-click to exclude',
    touch: 'Drag a box or tap an object · long-press to exclude',
  }
}

const DOT: Record<Tone, string> = {
  ok: 'bg-green-400',
  busy: 'animate-pulse bg-amber-400',
  error: 'bg-red-500',
}

/** A spring like iOS's: quick, with a hint of overshoot as the island grows or shrinks. */
const spring = { type: 'spring', bounce: 0.25, duration: 0.45 } as const

/**
 * The status, as an island like iOS's Dynamic Island but at the bottom: a
 * black capsule that grows to fit what it says, and makes room for Apply and
 * Cancel mid-selection.
 */
export function Status() {
  const { tone, text, touch = text, retry } = useLine()
  const selecting = ui.use((s) => s.selecting)
  // Just what's arrived, since the total grows as each file starts. A cached
  // model reads in a blink, so it only shows once the bytes keep coming.
  const downloaded = ui.use((s) =>
    s.tool === 'smart' && s.status === 'loading' && s.loaded < s.total
      ? mb(s.loaded)
      : 0,
  )
  const counting = useLasting(downloaded > 0)

  return (
    <MotionConfig transition={spring} reducedMotion='user'>
      <motion.div
        layout
        role='status'
        // In style, so the corners stay round while the size animates.
        style={{ borderRadius: 999 }}
        className={clsx(
          'absolute flex max-w-[calc(100%-2rem)] items-center gap-2 overflow-hidden bg-black py-1.5 pl-3.5 text-xs text-neutral-200 shadow-lg shadow-black/40',
          selecting || retry ? 'pr-1.5' : 'pr-3.5',
          'max-lg:bottom-20 max-lg:right-4 sm:max-lg:left-1/2 sm:max-lg:right-auto sm:max-lg:-translate-x-1/2',
          'lg:bottom-3 lg:left-1/2 lg:-translate-x-1/2',
        )}>
        <motion.span
          layout='position'
          className={clsx('size-1.5 shrink-0 rounded-full', DOT[tone])}
        />
        {/* Keyed by what it says, so new words fade in as the island resizes. */}
        <motion.span
          key={text}
          layout='position'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className='truncate'>
          <span className='pointer-coarse:hidden'>{text}</span>
          <span className='pointer-fine:hidden'>{touch}</span>
        </motion.span>
        {counting && (
          <motion.span
            layout='position'
            className='shrink-0 tabular-nums text-neutral-500'>
            {downloaded} MB
          </motion.span>
        )}
        {retry && (
          <Fade>
            <button
              type='button'
              onClick={api.retry}
              className={clsx(pill, light)}>
              Retry
            </button>
          </Fade>
        )}
        {/* Labels are already applied live; these close the selection out, either way. */}
        {selecting && (
          <Fade>
            <button
              type='button'
              onClick={api.cancel}
              className={clsx(pill, 'hocus:bg-white/10')}>
              Cancel <kbd className={kbd}>esc</kbd>
            </button>
            <button
              type='button'
              onClick={api.finish}
              className={clsx(pill, light)}>
              Apply <kbd className={clsx(kbd, 'text-neutral-500')}>space</kbd>
            </button>
          </Fade>
        )}
      </motion.div>
    </MotionConfig>
  )
}

function Fade({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      layout='position'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='flex shrink-0 gap-1'>
      {children}
    </motion.span>
  )
}

const pill =
  'h-6 cursor-pointer rounded-full px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-white/40'
const light = 'hocus:bg-neutral-200 bg-white font-medium text-neutral-950'
const kbd = 'font-sans text-neutral-500 pointer-coarse:hidden'
