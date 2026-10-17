import { AutoFix, Brush, ColorReset, FormatColorFill, PanTool } from 'src/icons'

import type { Tool } from '../lib'

type Look = {
  label: string
  keys: string
  Icon: typeof Brush
  /** What it does next, for a mouse and for touch, given the hand's key (⌘ or Ctrl). Smart Select's depends on the model. */
  hint?: (mod: string) => [string, string]
  /** The ring's size, as the Rail names it. */
  size?: string
  /** How the ring under the pointer looks. */
  ring?: string
}

/** How each tool looks; what it does lives in `lib/tools`. In toolbar order. */
export const TOOLS: Record<Tool, Look> = {
  move: {
    label: 'Move',
    keys: 'V',
    Icon: PanTool,
    hint: (mod) => [
      `Drag to orbit · scroll to zoom · right-drag to pan · hold ${mod} with any tool`,
      'Drag to orbit · pinch to zoom',
    ],
  },
  smart: { label: 'Smart Select', keys: 'S', Icon: AutoFix },
  fill: {
    label: 'Fill',
    keys: 'L',
    Icon: FormatColorFill,
    hint: () => [
      'Click or drag to fill up to folds · scroll to resize · hold ⇧ for the whole piece',
      'Tap or drag to fill up to folds · long-press for the whole piece',
    ],
    size: 'Fill Reach',
    // A tinted disc: Fill takes an area rather than following a stroke. Held
    // Shift ignores the ring for the whole piece, so it fades.
    ring: 'border-white/80 bg-white/15 in-data-shift:opacity-30',
  },
  brush: {
    label: 'Brush',
    keys: 'B',
    Icon: Brush,
    hint: (mod) => [
      `Paint · scroll to resize · hold ${mod} to orbit or zoom`,
      'Paint · two fingers to orbit',
    ],
    size: 'Brush Size',
    ring: 'border-white/80',
  },
  erase: {
    label: 'Eraser',
    keys: 'E',
    Icon: ColorReset,
    hint: (mod) => [
      `Erase · scroll to resize · hold ${mod} to orbit or zoom`,
      'Erase · two fingers to orbit',
    ],
    size: 'Brush Size',
    ring: 'border-dashed border-white',
  },
}
