import type { Behavior } from '../common'
import { discard, paint, recount, snapshot, target } from '../edit'
import { ui } from '../state'
import { pick } from '../view'

/** Labels the visible vertices inside the ring; the eraser labels them -1. */
export function brush(erase: boolean): Behavior {
  let id = -1
  const drag = (x: number, y: number) => {
    const r2 = ui.get().radius ** 2
    paint(
      pick((sx, sy) => (sx - x) ** 2 + (sy - y) ** 2 < r2),
      id,
    )
  }
  return {
    gesture: 'stroke',
    sized: true,
    press(x, y) {
      snapshot()
      id = erase ? -1 : target()
      drag(x, y)
    },
    drag,
    release: recount,
    abort: discard,
  }
}
