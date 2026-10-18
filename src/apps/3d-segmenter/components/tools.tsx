import { AutoFix, Brush, ColorReset, FormatColorFill, PanTool } from 'src/icons'

import { MOD_LABEL, type Tool } from '../lib'

type Look = {
  label: string
  Icon: typeof Brush
  /** What it does next, for a mouse and for touch. Smart Select's depends on the model. */
  hint?: [string, string]
  /** The ring's size, as the Rail names it. */
  size?: string
  /** How the ring under the pointer looks. */
  ring?: string
}

/** How each tool looks; what it does lives in `lib/tools`, its key in `TOOL_KEYS`. */
export const TOOLS: Record<Tool, Look> = {
  move: {
    label: 'Move',
    Icon: PanTool,
    hint: [
      `Drag to orbit · scroll to zoom · right-drag to pan · hold ${MOD_LABEL} with any tool`,
      'Drag to orbit · pinch to zoom',
    ],
  },
  smart: { label: 'Smart Select', Icon: AutoFix },
  fill: {
    label: 'Fill',
    Icon: FormatColorFill,
    hint: [
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
    Icon: Brush,
    hint: [
      `Paint · scroll to resize · hold ${MOD_LABEL} to orbit or zoom`,
      'Paint · two fingers to orbit and zoom',
    ],
    size: 'Brush Size',
    ring: 'border-white/80',
  },
  erase: {
    label: 'Eraser',
    Icon: ColorReset,
    hint: [
      `Erase · scroll to resize · hold ${MOD_LABEL} to orbit or zoom`,
      'Erase · two fingers to orbit and zoom',
    ],
    size: 'Brush Size',
    ring: 'border-dashed border-white',
  },
}
