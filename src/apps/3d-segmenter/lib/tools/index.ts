import { signal } from '../core'
import type { Tool } from '../editor'
import * as brush from './brush'
import * as eraser from './eraser'
import * as fill from './fill'
import * as move from './move'
import * as smart from './smart'

export { brush, eraser, fill, move, smart }

/** Every tool, in the toolbar's order. */
export const TOOLS: readonly Tool[] = [
  move.tool,
  smart.tool,
  fill.tool,
  brush.tool,
  eraser.tool,
]

/** The active tool; Smart Select is where you start. */
export const tool = signal<Tool>(smart.tool)
