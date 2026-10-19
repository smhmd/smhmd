import { Menu } from '@base-ui/react/menu'

import { doc, useValue } from '../lib'
import { item } from './ui'

type ClassMenuProps = Menu.Positioner.Props & {
  onPick(id: number): void
  /** Show each class's number key. */
  keys?: boolean
}

/** A menu of classes. Its list only renders, and subscribes, while open. */
export function ClassMenu({
  onPick,
  keys,
  children,
  ...positioner
}: ClassMenuProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner {...positioner}>
        <Menu.Popup className='min-w-40 rounded-lg bg-neutral-800 p-1 shadow-xl ring-1 ring-white/10'>
          <Items onPick={onPick} keys={keys} />
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )
}

function Items({ onPick, keys }: Pick<ClassMenuProps, 'onPick' | 'keys'>) {
  const classes = useValue(doc.classes)
  return classes.map((c, i) => (
    <Menu.Item key={c.id} className={item} onClick={() => onPick(c.id)}>
      <span className='size-2.5 rounded-sm' style={{ background: c.color }} />
      <span className='flex-1'>{c.name}</span>
      {keys && i < 9 && (
        <kbd className='font-sans text-neutral-500'>{i + 1}</kbd>
      )}
    </Menu.Item>
  ))
}
