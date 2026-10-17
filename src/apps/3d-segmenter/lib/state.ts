import { createStore } from 'src/lib/react'

import {
  CLASSES,
  type Box,
  type Cls,
  type Part,
  type Point,
  type Shading,
  type Status,
  type Tool,
} from './common'

/** Tools and viewport: every field is a primitive, so components subscribe to exactly what they show. */
export const ui = createStore({
  tool: 'smart' as Tool,
  radius: 24,
  /** The selected part, and the one under the pointer in the Parts list; -1 for none. */
  part: -1,
  hover: -1,
  status: 'loading' as Status,
  /** EdgeTAM's download so far, in bytes. */
  loaded: 0,
  total: 0,
  /** The file being opened, for the status. */
  opening: '',
  /** A passing error for the status, like a file that couldn't be opened. */
  notice: '',
  /** A Smart Select session is live: further clicks refine it, esc undoes it. */
  selecting: false,
  past: 0,
  future: 0,
  mesh: 0,
  /** Bumps whenever the SAM Cam has something new to draw. */
  frame: 0,
  shading: 'textures' as Shading,
  grid: true,
  /** Labels turn see-through and can't be painted over, revealing what's behind. */
  xray: false,
})

export type Option = 'grid' | 'xray'

export type Doc = {
  name: string
  classes: Cls[]
  active: number
  parts: Part[]
}

/** The document: what gets exported. Changes only on discrete edits, never mid-stroke. */
export const doc = createStore<Doc>({
  name: '',
  classes: CLASSES,
  active: CLASSES[0].id,
  parts: [],
})

/** Smart Select's prompts, in screen pixels. */
export const prompts = createStore({
  points: [] as Point[],
  box: null as Box | null,
})

let timer: ReturnType<typeof setTimeout> | undefined

/** Shows a passing error in the status for a few seconds. */
export function notify(notice: string) {
  clearTimeout(timer)
  ui.set({ notice })
  timer = setTimeout(() => ui.set({ notice: '' }), 5000)
}
