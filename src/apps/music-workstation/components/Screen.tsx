import { useEffect, useState } from 'react'

import clsx from 'clsx'

import { ExportGlyph, MuteGlyph } from '../icons'
import { store } from '../lib'
import ENDLESS from '../screens/endless/Endless'
import PATTERN from '../screens/pattern/Pattern'
import TOMBOLA from '../screens/tombola/Tombola'
import { Label } from './Hud'

// The store's `screen` field names the screen; each is a self-contained
// component that draws its own readouts and graphics.
const SCREENS = { TOMBOLA, ENDLESS, PATTERN }

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

/** Ticks while a take is rolling, so the counter moves. */
function useElapsed(since: number) {
  const [now, setNow] = useState(since)
  useEffect(() => {
    if (!since) return
    const id = setInterval(() => setNow(performance.now()), 250)
    return () => clearInterval(id)
  }, [since])
  return since ? Math.max(0, now - since) / 1000 : 0
}

/** The bottom band shared by every screen: sound, mute, tape. */
function Status() {
  const sound = store.use(({ sound }) => sound)
  const start = store.use(({ recordStart }) => recordStart)
  const take = store.use(({ take }) => take)
  const muted = store.use(({ muted }) => muted)
  const elapsed = useElapsed(start)

  // Three fixed slots — sound, mute, tape — so nothing shifts as they change.
  return (
    <div className='grid h-8 shrink-0 grid-cols-3 items-center px-4 *:last:justify-self-end'>
      <Label>{sound}</Label>
      <span className='flex justify-self-center text-xl'>
        {muted ? (
          <MuteGlyph role='img' aria-label='muted' strokeWidth={2.5} />
        ) : null}
      </span>
      {/* Tape: rolling (orange, pulsing) or a finished take ready to export */}
      {start || take ? (
        <span
          className={clsx(
            'flex items-center gap-1.5',
            start ? 'text-[#f24b00]' : 'text-white/60',
          )}>
          {start ? (
            <span className='size-1.5 animate-pulse rounded-full bg-current' />
          ) : (
            <ExportGlyph
              aria-label='take ready'
              className='text-xl *:stroke-[2.5]'
            />
          )}
          <span className='text-xs tabular-nums'>
            {clock(start ? elapsed : take)}
          </span>
        </span>
      ) : (
        <span />
      )}
    </div>
  )
}

export function Screen() {
  const Content = SCREENS[store.use(({ screen }) => screen)]

  return (
    <div className='bg-screen-border col-span-12 row-span-6 rounded p-px text-white'>
      {/* Every screen is a column: HUD band, graphics, status band. */}
      <div className='bg-screen rounded-ms relative flex size-full flex-col overflow-hidden'>
        <Content />
        <Status />
      </div>
    </div>
  )
}
