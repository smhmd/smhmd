import { useEffect, useRef } from 'react'

import { Hud, Item } from '../../components/Hud'
import { audio, COLORS, store } from '../../lib'
import {
  BALL_RADIUS,
  CAGE_RADIUS,
  MAX_BALLS,
  ROD_LENGTH,
  SIDES,
  tombola,
} from './physics'

const INK = '#e8e6e3'
const SHRINK = 0.7 // cage takes up this much of the graphics height
const VIEW_H = (2 * CAGE_RADIUS) / SHRINK // viewBox in world units
const VIEW_W = VIEW_H * 3 // the graphics band is wide and short

/**
 * The driver: one rAF loop advances the physics, fires the audio, and paints
 * the SVG by mutating attributes — React never re-renders per frame. It's
 * mounted exactly while this screen is up, so the sim sleeps elsewhere.
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

      for (const { note, impact } of tombola.step(dt, store.get())) {
        audio.play(note, Math.min(impact / 500, 1))
      }

      // Six free rods rather than a polygon, so they can swing open
      for (let side = 0; side < SIDES; side++) {
        const { mx, my, dx, dy } = tombola.rodAt(side)
        const line = rods.current[side]
        line?.setAttribute('x1', `${mx - dx * ROD_LENGTH}`)
        line?.setAttribute('y1', `${my - dy * ROD_LENGTH}`)
        line?.setAttribute('x2', `${mx + dx * ROD_LENGTH}`)
        line?.setAttribute('y2', `${my + dy * ROD_LENGTH}`)
      }

      // A fixed pool of notes; spares hide. A note flashes orange as it sounds.
      balls.current.forEach((circle, i) => {
        const ball = tombola.balls[i]
        circle?.setAttribute('visibility', ball ? 'visible' : 'hidden')
        if (!ball || !circle) return
        circle.setAttribute('cx', `${ball.x}`)
        circle.setAttribute('cy', `${ball.y}`)
        circle.setAttribute('r', `${BALL_RADIUS * (1 + ball.flash * 0.35)}`)
        circle.setAttribute('fill', ball.flash > 0.2 ? COLORS.orange : INK)
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <svg
      // Its own compositor layer: per-frame changes repaint only the cage,
      // not the whole device (and all its shadows) underneath.
      className='absolute inset-0 size-full will-change-transform'
      viewBox={`${-VIEW_W / 2} ${-VIEW_H / 2} ${VIEW_W} ${VIEW_H}`}
      aria-hidden>
      {Array.from({ length: SIDES }, (_, side) => (
        <line
          key={side}
          ref={(el) => void (rods.current[side] = el)}
          stroke={INK}
          strokeWidth={1.5}
          strokeLinecap='round'
          vectorEffect='non-scaling-stroke'
        />
      ))}
      {Array.from({ length: MAX_BALLS }, (_, i) => (
        <circle
          key={i}
          ref={(el) => void (balls.current[i] = el)}
          visibility='hidden'
        />
      ))}
    </svg>
  )
}

/** One readout per encoder, left to right like the knobs. */
function Readout() {
  const { spin, gravity, rods, bounce } = store.use()
  const turn = Math.round(spin)

  return (
    <Hud>
      <Item color={COLORS.blue} label='spin'>
        {turn > 0 ? `+${turn}` : turn}
      </Item>
      <Item color={COLORS.brown} label='gravity'>
        {Math.round(gravity * 10)}
      </Item>
      <Item color={COLORS.gray} label='open'>
        {Math.round(rods * 90)}°
      </Item>
      <Item color={COLORS.orange} label='bounce'>
        {Math.round(bounce * 10)}
      </Item>
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
