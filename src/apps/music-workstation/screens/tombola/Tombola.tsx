import { useEffect, useRef } from 'react'

import { Hud, Item, Label } from '../../components/Hud'
import { audio, COLORS, store } from '../../lib'
import {
  BALL_RADIUS,
  CAGE_RADIUS,
  MAX_BALLS,
  ROD_LENGTH,
  SIDES,
  tombola,
} from './physics'

const ROD = '#e8e6e3'
const ORANGE_DARK = '#200a02'
const SHRINK = 0.65 // cage takes up this much of the screen height
const VIEW_H = (2 * CAGE_RADIUS) / SHRINK // viewBox in world units
const VIEW_W = (VIEW_H * 5) / 3 // the screen's ~5:3 aspect

/**
 * The driver: one rAF loop advances the physics, fires the audio, and paints
 * the SVG by mutating attributes — React never re-renders per frame. It's
 * mounted exactly while this screen is up, so the sim deliberately sleeps
 * on the other screens.
 */
function Cage() {
  const rods = useRef<(SVGLineElement | null)[]>([])
  const balls = useRef<(SVGCircleElement | null)[]>([])

  useEffect(() => {
    let last = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 1 / 30) // clamp tab-switch jumps
      last = now

      // The store is the source of truth; the loop just reads it.
      for (const { note, impact } of tombola.step(dt, store.get())) {
        audio.play(note, Math.min(impact / 500, 1))
      }

      // Rods — six independent segments instead of a closed polygon,
      // so they can rotate open and leak notes through the corners
      for (let side = 0; side < SIDES; side++) {
        const line = rods.current[side]
        if (!line) continue
        const { mx, my, dx, dy } = tombola.rodAt(side)
        line.setAttribute('x1', `${mx - dx * ROD_LENGTH}`)
        line.setAttribute('y1', `${my - dy * ROD_LENGTH}`)
        line.setAttribute('x2', `${mx + dx * ROD_LENGTH}`)
        line.setAttribute('y2', `${my + dy * ROD_LENGTH}`)
      }

      // Notes — a fixed pool of circles; spares stay hidden
      for (let i = 0; i < MAX_BALLS; i++) {
        const circle = balls.current[i]
        if (!circle) continue
        const ball = tombola.balls[i]
        if (!ball) {
          circle.setAttribute('visibility', 'hidden')
          continue
        }
        circle.setAttribute('cx', `${ball.x}`)
        circle.setAttribute('cy', `${ball.y}`)
        circle.setAttribute('visibility', 'visible')
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <svg
      className='absolute inset-0 size-full'
      viewBox={`${-VIEW_W / 2} ${-VIEW_H / 2} ${VIEW_W} ${VIEW_H}`}>
      {Array.from({ length: SIDES }, (_, side) => (
        <line
          key={side}
          ref={(el) => {
            rods.current[side] = el
          }}
          stroke={ROD}
          strokeWidth={3}
          strokeLinecap='round'
          vectorEffect='non-scaling-stroke'
        />
      ))}
      {Array.from({ length: MAX_BALLS }, (_, i) => (
        <circle
          key={i}
          ref={(el) => {
            balls.current[i] = el
          }}
          r={BALL_RADIUS}
          fill={COLORS.blue}
          visibility='hidden'
        />
      ))}
    </svg>
  )
}

/** Parameter readouts in the HUD band. */
function Readout() {
  const { spin, gravity, bounce } = store.use()

  return (
    <Hud>
      <Item color={COLORS.blue} label='spin'>
        {Math.round(spin)}
      </Item>

      <div className='flex items-center gap-2' style={{ color: COLORS.brown }}>
        <div className='grid size-5 place-items-center rounded-full border border-current'>
          <div
            className='rounded-full bg-current'
            style={{ width: 2 + gravity * 14, height: 2 + gravity * 14 }}
          />
        </div>
        <Label>gravity</Label>
      </div>

      <div className='flex items-center gap-2' style={{ color: COLORS.orange }}>
        <Label>bounce</Label>
        <div
          className='relative h-4 w-7'
          style={{
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
            background: ORANGE_DARK,
          }}>
          <div
            className='absolute inset-y-0 left-0 bg-current'
            style={{ width: `${bounce * 100}%` }}
          />
        </div>
      </div>
    </Hud>
  )
}

export default function Tombola() {
  return (
    <>
      <Readout />
      <div className='relative flex-1'>
        <Cage />
      </div>
    </>
  )
}
