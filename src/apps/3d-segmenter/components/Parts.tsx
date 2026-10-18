import { memo } from 'react'

import { Menu } from '@base-ui/react/menu'
import clsx from 'clsx'

import { CenterFocus, Sell, Visibility, VisibilityOff } from 'src/icons'

import { api, doc, type Part, ui } from '../lib'
import { ClassMenu, item } from './ClassMenu'
import { button, Fold, IconButton, small, Tip, Trailing } from './ui'

/**
 * The model's own hierarchy, after Figma's layers panel: a hidden part dims
 * and keeps only its eye, since framing or labeling something you can't see
 * makes no sense. Alt-click an eye to solo a part, like Blender's local view.
 */
export function Parts() {
  const { parts } = doc.use()
  const anyHidden = parts.some((p) => p.hidden)

  return (
    <Fold
      value='parts'
      title='Parts'
      unit='vertices'
      className='border-white/6 border-t lg:flex-1'
      action={
        // One switch for the whole list: shows everything if anything is hidden, else hides it all.
        <IconButton
          label={anyHidden ? 'Show All Parts' : 'Hide All Parts'}
          className={small}
          onClick={anyHidden ? api.showAllParts : api.hideAllParts}>
          {anyHidden ? (
            <VisibilityOff aria-hidden />
          ) : (
            <Visibility aria-hidden />
          )}
        </IconButton>
      }>
      <ul className='no-scrollbar min-h-0 overflow-y-auto overscroll-contain px-1.5 pb-1.5 max-lg:max-h-[45dvh] lg:flex-1'>
        {parts.map((part, i) => (
          <Row key={part.start} part={part} index={i} />
        ))}
      </ul>
    </Fold>
  )
}

/**
 * Re-renders only when its part, its class or its selection changes. Hovering
 * or selecting a row outlines the part in the canvas.
 */
const Row = memo(({ part, index }: { part: Part; index: number }) => {
  const selected = ui.use((s) => s.part === index)
  // Primitives, so edits to other classes (like their counts) skip this row.
  const name = doc.use((s) => s.classes.find((c) => c.id === part.cls)?.name)
  const color = doc.use((s) => s.classes.find((c) => c.id === part.cls)?.color)

  return (
    <li
      className={clsx(
        'group flex h-8 items-center rounded-lg text-xs',
        selected
          ? 'bg-white/10 text-white'
          : 'hocus-within:bg-white/5 text-neutral-300',
      )}
      onPointerEnter={() => api.hoverPart(index)}
      onPointerLeave={() => api.hoverPart(-1)}>
      <button
        type='button'
        aria-pressed={selected}
        disabled={part.hidden}
        onClick={() => api.selectPart(index)}
        onFocus={() => api.hoverPart(index)}
        onBlur={() => api.hoverPart(-1)}
        className='h-full min-w-0 flex-1 cursor-pointer truncate rounded-lg pl-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-default disabled:text-neutral-600'>
        {part.name}
      </button>
      <Trailing count={part.count} pinned={part.hidden}>
        {!part.hidden && (
          <IconButton
            label='Fit to View'
            className={small}
            onClick={() => api.fit(part)}>
            <CenterFocus aria-hidden />
          </IconButton>
        )}
        <IconButton
          label={part.hidden ? 'Show Part' : 'Hide Part'}
          keys='⌥ solo'
          className={small}
          onClick={(e) =>
            e.altKey ? api.soloPart(index) : api.togglePart(index)
          }>
          {part.hidden ? (
            <VisibilityOff aria-hidden />
          ) : (
            <Visibility aria-hidden />
          )}
        </IconButton>
      </Trailing>
      {part.hidden ? (
        <span className={clsx(small, 'shrink-0')} />
      ) : (
        <Assign part={part} name={name} color={color} />
      )}
    </li>
  )
})

Row.displayName = 'Row'

type AssignProps = { part: Part; name?: string; color?: string }

/** Shows the part's class at rest; the tag only appears on hocus for unlabeled parts. */
function Assign({ part, name, color }: AssignProps) {
  return (
    <Menu.Root>
      <Tip label={name ? `${name} · Relabel` : 'Label Whole Part'}>
        <Menu.Trigger
          aria-label={`Label ${part.name}`}
          className={clsx(
            button,
            small,
            !name &&
              'pointer-fine:invisible pointer-fine:group-hocus-within:visible data-popup-open:visible',
          )}>
          {name ? (
            <span
              className='size-3! rounded-sm ring-1 ring-black/30'
              style={{ background: color }}
            />
          ) : (
            <Sell aria-hidden />
          )}
        </Menu.Trigger>
      </Tip>
      <ClassMenu
        align='end'
        sideOffset={4}
        onPick={(id) => api.assignPart(part, id)}>
        <Menu.Separator className='my-1 h-px bg-white/10' />
        <Menu.Item className={item} onClick={() => api.assignPart(part, -1)}>
          Clear Labels
        </Menu.Item>
      </ClassMenu>
    </Menu.Root>
  )
}
