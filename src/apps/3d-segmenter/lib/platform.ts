import { isMac } from 'src/lib/env'

/** The primary modifier, as `KeyboardEvent.key` names it. */
export const MOD = isMac ? 'Meta' : 'Control'
/** The same, as hints write it. */
export const MOD_LABEL = isMac ? '⌘' : 'Ctrl'
export const UNDO_KEYS = isMac ? '⌘Z' : 'Ctrl+Z'
export const REDO_KEYS = isMac ? '⇧⌘Z' : 'Ctrl+Shift+Z'
