import { memo, useState } from 'react'

import clsx from 'clsx'

import { Add, Close, ColorReset, Visibility, VisibilityOff } from 'src/icons'

import { api, doc, mesh, useValue } from '../lib'
import { Fold, IconButton, small, Tip, Trailing } from './ui'

export function Classes() {
  const classes = useValue(doc.classes)
  const active = useValue(doc.activeId)

  return (
    <Fold
      value='classes'
      title='Classes'
      unit='vertices'
      className='shrink-0'
      action={
        <IconButton label='New Class' className={small} onClick={api.addClass}>
          <Add aria-hidden />
        </IconButton>
      }>
      <ul className='no-scrollbar max-h-[40dvh] overflow-y-auto overscroll-contain px-1.5 lg:max-h-72'>
        {classes.map((cls, i) => (
          <Row key={cls.id} cls={cls} index={i} active={cls.id === active} />
        ))}
      </ul>
      <Progress classes={classes} />
    </Fold>
  )
}

/** The one place that names the unit, so rows can show bare numbers. */
function Progress({ classes }: { classes: doc.Cls[] }) {
  const { counts } = useValue(mesh.tally)
  const count = (id: number) => counts.get(id) ?? 0
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0)
  const labeled = classes.reduce((sum, c) => sum + count(c.id), 0)
  const percent = total ? Math.round((labeled / total) * 100) : 0

  return (
    <div className='flex flex-col gap-2 px-3 pb-3 pt-2'>
      <p className='flex items-baseline justify-between gap-2 whitespace-nowrap text-xs'>
        <span className='text-neutral-500'>Labeled</span>
        <span className='font-mono font-medium tabular-nums text-neutral-200'>
          {percent}%
        </span>
      </p>
      <div className='bg-white/8 flex h-1.5 overflow-hidden rounded-full'>
        {classes.map((c) => (
          <span
            key={c.id}
            className='transition-[width] duration-300'
            style={{
              width: `${total ? (count(c.id) / total) * 100 : 0}%`,
              background: c.color,
            }}
          />
        ))}
      </div>
    </div>
  )
}

type RowProps = { cls: doc.Cls; index: number; active: boolean }

/** Memoized on a class object that only changes when that class does. */
const Row = memo(({ cls, index, active }: RowProps) => {
  const [editing, setEditing] = useState(false)
  const { id, name, color, hidden } = cls
  const count = useValue(() => mesh.tally.value.counts.get(id) ?? 0, [id])

  function rename(value: string) {
    if (value.trim()) api.editClass(id, { name: value.trim() })
    setEditing(false)
  }

  return (
    <li
      className={clsx(
        'group flex h-9 items-center gap-1 rounded-lg pl-2 text-[13px] lg:h-8 lg:text-xs',
        active
          ? 'bg-white/10 text-white'
          : 'hocus-within:bg-white/5 text-neutral-300',
      )}>
      <label
        title='Change Color'
        className='has-focus-visible:ring-2 has-focus-visible:ring-white/40 grid size-5 shrink-0 cursor-pointer place-items-center rounded'>
        <span
          className={clsx(
            'size-3 rounded-sm ring-1 ring-black/30',
            hidden && 'opacity-30',
          )}
          style={{ background: color }}
        />
        <input
          type='color'
          value={color}
          aria-label={`${name} Color`}
          onChange={(e) => api.editClass(id, { color: e.target.value })}
          className='sr-only'
        />
      </label>

      {editing ? (
        <input
          autoFocus
          aria-label='Class Name'
          defaultValue={name}
          onFocus={(e) => e.target.select()}
          onBlur={(e) => rename(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEditing(false)
          }}
          className='h-6 min-w-0 flex-1 rounded bg-neutral-950 px-1 outline-none ring-1 ring-sky-500'
        />
      ) : (
        // First click selects; clicking the selected class renames it.
        <Tip
          label={active ? 'Rename' : 'Select'}
          keys={index < 9 ? `${index + 1}` : undefined}>
          <button
            type='button'
            aria-pressed={active}
            onClick={() => (active ? setEditing(true) : api.selectClass(id))}
            className={clsx(
              'flex h-full min-w-0 flex-1 items-center gap-2 px-1 text-left',
              active ? 'cursor-text' : 'cursor-pointer',
            )}>
            <span className='truncate'>{name}</span>
          </button>
        </Tip>
      )}

      <Trailing count={count} pinned={hidden}>
        <IconButton
          label='Clear Labels'
          className={small}
          disabled={!count}
          onClick={() => api.clearClass(id)}>
          <ColorReset aria-hidden />
        </IconButton>
        <IconButton
          label={hidden ? 'Show Labels' : 'Hide Labels'}
          className={small}
          onClick={() => api.editClass(id, { hidden: !hidden })}>
          {hidden ? <VisibilityOff aria-hidden /> : <Visibility aria-hidden />}
        </IconButton>
        <IconButton
          label='Delete Class'
          className={small}
          onClick={() => api.removeClass(id)}>
          <Close aria-hidden />
        </IconButton>
      </Trailing>
    </li>
  )
})

Row.displayName = 'Row'
