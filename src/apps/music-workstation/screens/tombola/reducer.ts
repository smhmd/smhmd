import type { Controls, KnobMap, State } from '../../lib/common'
import { tombola } from './physics'

export const knobs: KnobMap = {
  blue: { key: 'spin', perTurn: 10, min: -10, max: 10 },
  brown: { key: 'gravity', perTurn: 1, min: 0, max: 1 },
  gray: { key: 'rods', perTurn: 1, min: 0, max: 1 },
  orange: { key: 'bounce', perTurn: 1, min: 0, max: 1 },
}

/** A key press drops a ball; it sounds when it bounces. */
export const attack = (_: State, note: string) => void tombola.add(note)

export const controls: Controls = {
  // play swings the rods open to release the notes, and closed again
  play: ({ rods }) => ({ rods: rods > 0.5 ? 0 : 1 }),
  // scissors takes out the last note dropped in
  delete: () => void tombola.balls.pop(),
  left: ({ spin }) => ({ spin: Math.max(-10, Math.round(spin) - 1) }),
  right: ({ spin }) => ({ spin: Math.min(10, Math.round(spin) + 1) }),
}
