import { Menu } from '@base-ui/react/menu'
import clsx from 'clsx'

import { CenterFocus, Sell, Visibility, VisibilityOff } from 'src/icons'

import { api, type Cls, doc, type Part } from '../lib'
import { button, IconButton, Section, small, Tip, Trailing } from './ui'

const item =
  'flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-xs text-neutral-200 outline-none data-highlighted:bg-white/10'

/**
 * The model's own hierarchy, after Figma's layers panel: a hidden part dims
 * and keeps only its eye, since framing or labeling something you can't see
 * makes no sense. Alt-click an eye to solo a part, like Blender's local view.
 */
export function Parts() {
  const { parts, classes } = doc.use()
  const anyHidden = parts.some((p) => p.hidden)

  return (
    <Section
      title='Parts'
      unit='vertices'
      className='border-white/6 flex-1 border-t max-lg:hidden'
      action={
        // One switch for the whole list: shows everything if anything is hidden, else hides it all.
        <IconButton
          label={anyHidden ? 'Show all parts' : 'Hide all parts'}
          className={small}
          onClick={anyHidden ? api.showAllParts : api.hideAllParts}>
          {anyHidden ? (
            <VisibilityOff aria-hidden />
          ) : (
            <Visibility aria-hidden />
          )}
        </IconButton>
      }>
      <ul className='no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-1.5'>
        {parts.map((part, i) => (
          <li
            key={part.start}
            className='hocus-within:bg-white/5 group flex h-8 items-center rounded-lg pl-3 text-xs text-neutral-300'>
            <span
              className={clsx(
                'min-w-0 flex-1 truncate',
                part.hidden && 'text-neutral-600',
              )}>
              {part.name}
            </span>
            <Trailing count={part.count} pinned={part.hidden}>
              {!part.hidden && (
                <IconButton
                  label='Frame part'
                  className={small}
                  onClick={() => api.frame(part)}>
                  <CenterFocus aria-hidden />
                </IconButton>
              )}
              <IconButton
                label={part.hidden ? 'Show part' : 'Hide part'}
                keys='⌥ solo'
                className={small}
                onClick={(e) =>
                  e.altKey ? api.soloPart(i) : api.togglePart(i)
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
              <Assign part={part} classes={classes} />
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** Shows the part's class at rest; the tag only appears on hocus for unlabeled parts. */
function Assign({ part, classes }: { part: Part; classes: Cls[] }) {
  const current = classes.find((c) => c.id === part.cls)

  return (
    <Menu.Root>
      <Tip label={current ? `${current.name} · relabel` : 'Label whole part'}>
        <Menu.Trigger
          aria-label={`Label ${part.name}`}
          className={clsx(
            button,
            small,
            !current &&
              'pointer-fine:invisible pointer-fine:group-hocus-within:visible data-popup-open:visible',
          )}>
          {current ? (
            <span
              className='size-3! rounded-sm ring-1 ring-black/30'
              style={{ background: current.color }}
            />
          ) : (
            <Sell aria-hidden />
          )}
        </Menu.Trigger>
      </Tip>
      <Menu.Portal>
        <Menu.Positioner align='end' sideOffset={4}>
          <Menu.Popup className='min-w-40 rounded-lg bg-neutral-800 p-1 shadow-xl ring-1 ring-white/10'>
            {classes.map((c) => (
              <Menu.Item
                key={c.id}
                className={item}
                onClick={() => api.assignPart(part, c.id)}>
                <span
                  className='size-2.5 rounded-sm'
                  style={{ background: c.color }}
                />
                {c.name}
              </Menu.Item>
            ))}
            <Menu.Separator className='my-1 h-px bg-white/10' />
            <Menu.Item
              className={item}
              onClick={() => api.assignPart(part, -1)}>
              Clear labels
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
