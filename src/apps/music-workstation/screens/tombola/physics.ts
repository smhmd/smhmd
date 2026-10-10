import { clamp, HALF_PI, PI, TAU } from 'src/lib/math'

export const SIDES = 6
export const CAGE_RADIUS = 100 // world units, scaled to fit the screen at render time
export const BALL_RADIUS = 6
export const ROD_LENGTH = CAGE_RADIUS * Math.sin(PI / SIDES) // half-length of one rod
export const MAX_BALLS = 8

const APOTHEM = CAGE_RADIUS * Math.cos(PI / SIDES) // center → rod midpoint
const SPIN_RATE = 0.4 // rad/s per spin unit (spin knob lives in -10..10)
const MAX_GRAVITY = 1200 // px/s² at full knob
const MAX_ROD_ANGLE = HALF_PI // rods knob at 1 turns every rod 90° open
const ROD_RATE = 2 // rods-knob units/s — rods swing toward the knob, never teleport
const ESCAPE_RADIUS = 350 // balls past this are offscreen and get cleaned up
const MIN_IMPACT = 40 // px/s — softer touches bounce silently
const HIT_COOLDOWN = 0.06 // s — one ball rattling in a corner sounds once, not per substep
const MAX_SPEED = 900 // px/s — a spinning cage with high bounce pumps energy in; cap it

// Robustness: rods are zero-thickness segments, so a ball must never move
// (relative to a rod) far enough in one step for its center to cross one —
// otherwise the push-out sends it the wrong way. We substep so that relative
// travel per substep stays well under a radius.
const MAX_TRAVEL = BALL_RADIUS / 3
const MAX_SUBSTEPS = 32

export type Ball = {
  note: string
  x: number
  y: number
  vx: number
  vy: number
  quiet: number // seconds until this ball may sound again
  flash: number // 1 on a sounding hit, fading to 0 — drives the render
}
export type Hit = { note: string; impact: number }
export type Params = {
  spin: number // -10..10, snapped to integers so a displayed 0 is truly still
  gravity: number // 0..1
  bounce: number // 0..1
  rods: number // 0..1, target for how far each rod is rotated open
}
type Rod = { mx: number; my: number; dx: number; dy: number }

export const tombola = {
  angle: 0,
  rods: 0, // actual rod opening; eases toward the knob at ROD_RATE
  balls: [] as Ball[],

  add(note: string) {
    if (this.balls.length === MAX_BALLS) this.balls.shift()
    const direction = Math.random() * TAU
    this.balls.push({
      note,
      x: 0,
      y: 0,
      vx: Math.cos(direction) * 60,
      vy: Math.sin(direction) * 60,
      quiet: 0,
      flash: 0,
    })
  },

  /** Midpoint and direction of one rod — shared by physics and rendering. */
  rodAt(side: number): Rod {
    const theta = this.angle + ((side + 0.5) * TAU) / SIDES // rod midpoint direction
    const phi = theta + HALF_PI + this.rods * MAX_ROD_ANGLE // rod orientation
    return {
      mx: Math.cos(theta) * APOTHEM,
      my: Math.sin(theta) * APOTHEM,
      dx: Math.cos(phi),
      dy: Math.sin(phi),
    }
  },

  /** Advance the simulation by `dt` seconds and report hits. */
  step(dt: number, { spin, gravity, bounce, rods: target }: Params) {
    const hits: Hit[] = []
    const omega = Math.round(spin) * SPIN_RATE // the HUD shows the rounded value
    const restitution = 0.2 + bounce * 0.75
    const g = gravity * MAX_GRAVITY

    // Rods ease toward the knob, so their sweep speed is bounded too
    const rodsDelta = clamp(-ROD_RATE * dt, target - this.rods, ROD_RATE * dt)
    const rodsRate = dt > 0 ? rodsDelta / dt : 0
    const twist = rodsRate * MAX_ROD_ANGLE // rod self-rotation, rad/s

    // Fastest anything moves relative to anything else → substep count
    let fastest = 0
    for (const { vx, vy } of this.balls)
      fastest = Math.max(fastest, vx * vx + vy * vy)
    const rodSpeed =
      Math.abs(omega) * CAGE_RADIUS + Math.abs(twist) * ROD_LENGTH
    const travel = (Math.sqrt(fastest) + g * dt + rodSpeed) * dt
    const substeps = clamp(1, Math.ceil(travel / MAX_TRAVEL), MAX_SUBSTEPS)
    const h = dt / substeps

    for (const ball of this.balls) {
      ball.quiet -= dt
      ball.flash = Math.max(0, ball.flash - dt * 5)
    }

    const hit = (ball: Ball, impact: number) => {
      if (impact <= MIN_IMPACT || ball.quiet > 0) return
      ball.quiet = HIT_COOLDOWN
      ball.flash = 1
      hits.push({ note: ball.note, impact })
    }

    const cage: Rod[] = []
    for (let i = 0; i < substeps; i++) {
      this.angle += omega * h
      this.rods += rodsDelta / substeps
      for (let side = 0; side < SIDES; side++) cage[side] = this.rodAt(side)

      for (const ball of this.balls) {
        ball.vy += g * h
        ball.x += ball.vx * h
        ball.y += ball.vy * h
      }

      // Ball ↔ ball first, so the rods get the last word on position —
      // a pile of balls can never shove one of them through the cage.
      for (let a = 0; a < this.balls.length; a++) {
        for (let b = a + 1; b < this.balls.length; b++) {
          collideBalls(this.balls[a], this.balls[b], restitution, hit)
        }
      }

      for (const ball of this.balls) {
        for (const rod of cage)
          collideRod(ball, rod, omega, twist, restitution, hit)

        // Clamp runaway energy
        const speed = Math.hypot(ball.vx, ball.vy)
        if (speed > MAX_SPEED) {
          ball.vx *= MAX_SPEED / speed
          ball.vy *= MAX_SPEED / speed
        }
      }
    }

    // Escaped balls are gone for good
    this.balls = this.balls.filter(
      ({ x, y }) => x * x + y * y < ESCAPE_RADIUS ** 2,
    )

    return hits
  },
}

/** Equal masses, so they trade velocity along the contact normal. */
function collideBalls(
  A: Ball,
  B: Ball,
  restitution: number,
  hit: (ball: Ball, impact: number) => void,
) {
  const dx = B.x - A.x
  const dy = B.y - A.y
  const distance = Math.hypot(dx, dy)
  if (distance >= BALL_RADIUS * 2) return

  // Coincident centers (two notes dropped at once): pick any normal
  const nx = distance > 0 ? dx / distance : 1
  const ny = distance > 0 ? dy / distance : 0
  const overlap = (BALL_RADIUS * 2 - distance) / 2
  A.x -= nx * overlap
  A.y -= ny * overlap
  B.x += nx * overlap
  B.y += ny * overlap

  const closing = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny
  if (closing <= 0) return // already separating

  const impulse = ((1 + restitution) * closing) / 2
  A.vx -= impulse * nx
  A.vy -= impulse * ny
  B.vx += impulse * nx
  B.vy += impulse * ny

  hit(A, closing)
  hit(B, closing)
}

/**
 * Each side is a free-standing rod (segment), so balls can slip through the
 * corner gaps once the rods are rotated open — and only then.
 */
function collideRod(
  ball: Ball,
  { mx, my, dx, dy }: Rod,
  omega: number,
  twist: number,
  restitution: number,
  hit: (ball: Ball, impact: number) => void,
) {
  // Closest point on the rod to the ball
  const s = clamp(
    -ROD_LENGTH,
    (ball.x - mx) * dx + (ball.y - my) * dy,
    ROD_LENGTH,
  )
  const cx = mx + dx * s
  const cy = my + dy * s
  const ex = ball.x - cx
  const ey = ball.y - cy
  const distance = Math.hypot(ex, ey)
  if (distance >= BALL_RADIUS) return

  // Dead-center on the rod: fall back to the side facing the cage center
  const nx = distance > 0 ? ex / distance : -mx / APOTHEM
  const ny = distance > 0 ? ey / distance : -my / APOTHEM
  ball.x += nx * (BALL_RADIUS - distance)
  ball.y += ny * (BALL_RADIUS - distance)

  // Velocity of the contact point: the cage's spin about the origin, plus
  // the rod's own twist about its midpoint while the rods knob moves.
  const rodVx = -omega * cy - twist * s * dy
  const rodVy = omega * cx + twist * s * dx
  const impact = (ball.vx - rodVx) * nx + (ball.vy - rodVy) * ny
  if (impact >= 0) return // already separating

  ball.vx -= (1 + restitution) * impact * nx
  ball.vy -= (1 + restitution) * impact * ny
  hit(ball, -impact)
}
