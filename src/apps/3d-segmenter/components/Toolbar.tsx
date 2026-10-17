import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import clsx from 'clsx'

import { api, type Tool, ui, useMod } from '../lib'
import { TOOLS } from './tools'
import { button, glass, Tip } from './ui'

export function Toolbar() {
  const tool = ui.use((s) => s.tool)
  const { mod } = useMod()

  return (
    <nav
      aria-label='Tools'
      className={clsx(
        glass,
        'flex items-center gap-1',
        // Right-aligned on phones to clear the app drawer button.
        'max-lg:absolute max-lg:bottom-4 max-lg:right-4 max-lg:rounded-2xl max-lg:p-1.5',
        'sm:max-lg:left-1/2 sm:max-lg:right-auto sm:max-lg:-translate-x-1/2',
      )}>
      <ToggleGroup
        value={[tool]}
        onValueChange={([next]) => next && api.setTool(next as Tool)}
        className='flex gap-1'>
        {Object.entries(TOOLS).map(([id, { label, keys, Icon }]) => (
          <Tip
            key={id}
            label={label}
            keys={id === 'move' ? `${keys} · or hold ${mod}` : keys}>
            <Toggle
              value={id}
              aria-label={label}
              className={clsx(
                button,
                // Held Ctrl borrows the Move tool, so show it as the active one.
                id === 'move'
                  ? 'in-data-hand:bg-white/12 in-data-hand:text-white'
                  : 'in-data-hand:data-pressed:bg-transparent in-data-hand:data-pressed:text-neutral-400',
              )}>
              <Icon aria-hidden />
            </Toggle>
          </Tip>
        ))}
      </ToggleGroup>
    </nav>
  )
}
