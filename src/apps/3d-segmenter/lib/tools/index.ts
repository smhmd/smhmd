import type { Behavior, Tool } from '../common'
import { brush } from './brush'
import { fill } from './fill'
import { smart } from './smart'

/** What each tool does; how it looks lives in `components/tools.tsx`. */
export const tools: Record<Tool, Behavior> = {
  move: {},
  smart,
  fill,
  brush: brush(false),
  erase: brush(true),
}
