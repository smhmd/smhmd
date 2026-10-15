import { Menu } from '@base-ui/react/menu'
import clsx from 'clsx'

import { Redo, Undo } from 'src/icons'

import { api, doc, ui } from '../lib'
import { Size } from './Inspector'
import { button, IconButton, small, Tip } from './ui'

const item =
  'flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-xs text-neutral-200 outline-none data-highlighted:bg-white/10'

/** Procreate's sidebar: brush size, the class you're labeling with, then undo and redo. */
export function Rail() {
  const painting = ui.use((s) => s.tool === 'brush' || s.tool === 'erase')
  const canUndo = ui.use((s) => s.past > 0)
  const canRedo = ui.use((s) => s.future > 0)

  return (
    <div
      className={clsx(
        'absolute left-3 flex flex-col items-center gap-1.5 rounded-xl bg-black/40 p-1.5 backdrop-blur-md',
        // Centered on large screens; on phones, above the app drawer button and clear of the class card.
        'bottom-20 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2',
      )}>
      {/* Always there, like Procreate's: muted outside the brush and eraser, but still adjustable. */}
      <Tip label='Brush size' keys='[ ]'>
        <span
          className={clsx(
            'hocus-within:opacity-100 mb-1.5 block transition-opacity',
            !painting && 'opacity-40',
          )}>
          <Size vertical />
        </span>
      </Tip>
      <Picker />
      <IconButton
        label='Undo'
        keys='⌘Z'
        disabled={!canUndo}
        onClick={api.undo}
        className={small}>
        <Undo aria-hidden />
      </IconButton>
      <IconButton
        label='Redo'
        keys='⇧⌘Z'
        disabled={!canRedo}
        onClick={api.redo}
        className={small}>
        <Redo aria-hidden />
      </IconButton>
    </div>
  )
}

/** Where Procreate puts its color square: the active class, and a menu to switch it. */
function Picker() {
  const { classes, active } = doc.use()
  const current = classes.find((c) => c.id === active)

  return (
    <Menu.Root>
      <Tip
        label={current ? `Painting ${current.name}` : 'Pick a class'}
        keys='1–9'>
        <Menu.Trigger
          aria-label={`Active class: ${current?.name ?? 'none'}`}
          className={clsx(button, small)}>
          <span
            className='size-4! rounded-[5px] ring-2 ring-white/70'
            style={{ background: current?.color ?? 'transparent' }}
          />
        </Menu.Trigger>
      </Tip>
      <Menu.Portal>
        <Menu.Positioner side='right' sideOffset={10}>
          <Menu.Popup className='min-w-40 rounded-lg bg-neutral-800 p-1 shadow-xl ring-1 ring-white/10'>
            {classes.map((c, i) => (
              <Menu.Item
                key={c.id}
                className={item}
                onClick={() => api.selectClass(c.id)}>
                <span
                  className='size-2.5 rounded-sm'
                  style={{ background: c.color }}
                />
                <span className='flex-1'>{c.name}</span>
                {i < 9 && (
                  <kbd className='font-sans text-neutral-500'>{i + 1}</kbd>
                )}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
