import { Brush, ColorReset } from 'src/icons'

import * as editor from '../editor'
import { doc } from '../core'
import { MOD_LABEL } from '../platform'
import * as session from '../session'
import * as view from '../view'

/** Labels the vertices seen inside the ring; the eraser labels them -1, X-ray or not. */
/** The brush, or with `erase`, the eraser. */
export function make(erase: boolean): editor.Tool {
  let id = -1
  const drag = (x: number, y: number, tx: doc.Tx) => {
    const r2 = session.radius.peek() ** 2
    tx.paint(
      view.pick((sx, sy) => (sx - x) ** 2 + (sy - y) ** 2 < r2),
      id,
    )
  }
  const verb = erase ? 'Erase' : 'Paint'
  return {
    id: erase ? 'erase' : 'brush',
    label: erase ? 'Eraser' : 'Brush',
    Icon: erase ? ColorReset : Brush,
    key: erase ? 'e' : 'b',
    hint: {
      mouse: `${verb} · scroll to resize · hold ${MOD_LABEL} to orbit or zoom`,
      touch: `${verb} · two fingers to orbit and zoom`,
    },
    ring: {
      label: 'Brush Size',
      style: erase ? 'border-dashed border-white' : 'border-white/80',
    },
    gesture: 'stroke',
    ignoresXray: erase,
    press(x, y, tx) {
      id = erase ? -1 : doc.targetClass()
      drag(x, y, tx)
    },
    drag,
  }
}

export const tool = make(false)
