import { Menu } from '@base-ui/react/menu'
import clsx from 'clsx'

import { Redo, Undo } from 'src/icons'

import { activeClass, api, doc, RADIUS, REDO_KEYS, ui, UNDO_KEYS } from '../lib'
import { ClassMenu } from './ClassMenu'
import { TOOLS } from './tools'
import { button, IconButton, island, Range, small, Tip } from './ui'

/** Procreate's sidebar: the ring's size, the class you're labeling with, then undo and redo. */
export function Rail() {
  const size = ui.use((s) => TOOLS[s.tool].size)
  const canUndo = ui.use((s) => s.past > 0)
  const canRedo = ui.use((s) => s.future > 0)

  return (
    <div
      className={clsx(
        island,
        'absolute left-3 flex flex-col items-center gap-1.5 p-1.5',
        // Centered on large screens; on phones, above the status and the tools.
        'bottom-28 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2',
      )}>
      {/* Always there, like Procreate's: muted outside the brush and eraser, but still adjustable. */}
      <Tip label={size ?? 'Brush Size'} keys='[ ]'>
        <span
          className={clsx(
            'hocus-within:opacity-100 mb-1.5 block transition-opacity',
            !size && 'opacity-40',
          )}>
          <Size />
        </span>
      </Tip>
      <Picker />
      <IconButton
        label='Undo'
        keys={UNDO_KEYS}
        disabled={!canUndo}
        onClick={api.undo}
        className={small}>
        <Undo aria-hidden />
      </IconButton>
      <IconButton
        label='Redo'
        keys={REDO_KEYS}
        disabled={!canRedo}
        onClick={api.redo}
        className={small}>
        <Redo aria-hidden />
      </IconButton>
    </div>
  )
}

function Size() {
  const radius = ui.use('radius')
  return (
    <Range
      label='Brush Size'
      value={radius}
      {...RADIUS}
      vertical
      onChange={api.setRadius}
    />
  )
}

/** Where Procreate puts its color square: the active class, and a menu to switch it. */
function Picker() {
  const name = doc.use((s) => activeClass(s)?.name)
  const color = doc.use((s) => activeClass(s)?.color)

  return (
    <Menu.Root>
      <Tip label={name ? `Painting ${name}` : 'Pick a Class'} keys='1–9'>
        <Menu.Trigger
          aria-label={`Active Class: ${name ?? 'none'}`}
          className={clsx(button, small)}>
          <span
            className='size-4! rounded-[5px] ring-2 ring-white/70'
            style={{ background: color }}
          />
        </Menu.Trigger>
      </Tip>
      <ClassMenu side='right' sideOffset={10} keys onPick={api.selectClass} />
    </Menu.Root>
  )
}
