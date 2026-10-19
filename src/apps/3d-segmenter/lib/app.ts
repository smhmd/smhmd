import { api } from './api'
import { SAMPLE } from './common'
import * as editor from './editor'
import * as navigation from './navigation'
import * as render from './render'
import { sam } from './sam'
import { tool, TOOLS } from './tools'

/** The keymap, as `useShortcuts` names keys: `x`, `mod+z`, `mod+shift+z`, `digit1`. */
export const keys: ReadonlyMap<string, () => void> = new Map([
  ...TOOLS.map((t) => [t.key, () => api.setTool(t)] as const),
  // The physical number row, so AZERTY's & é " … pick classes too.
  ...[...Array(9).keys()].map(
    (i) => [`digit${i + 1}`, () => api.selectClassAt(i)] as const,
  ),
  ['[', api.shrink],
  [']', api.grow],
  ['f', () => api.fitSelection()],
  ['x', () => api.toggleXray()],
  ['g', () => api.toggleGrid()],
  ['t', () => api.toggleShading('textures')],
  ['w', () => api.toggleShading('wireframe')],
  [' ', () => api.complete()],
  ['enter', () => api.complete()],
  ['escape', () => api.cancel()],
  ['mod+z', () => api.undo()],
  ['mod+shift+z', () => api.redo()],
])

/** Starts what follows state: drawing, navigation and the active tool. Returns what stops it. */
export function wire() {
  const stops = [render.start(), navigation.start(tool), editor.start(tool)]
  return () => stops.forEach((stop) => stop())
}

/** Starts the app: what follows state, EdgeTAM and the sample. Returns what stops it. */
export function start() {
  const unwire = wire()
  api.retry()
  void api.open(SAMPLE.url)
  return () => {
    unwire()
    sam.stop()
  }
}
