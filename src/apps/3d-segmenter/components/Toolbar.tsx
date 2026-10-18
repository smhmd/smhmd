import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import clsx from 'clsx'

import { api, MOD_LABEL, TOOL_KEYS, TOOL_ORDER, ui } from '../lib'
import { TOOLS } from './tools'
import { button, glass, Tip } from './ui'

export function Toolbar() {
  const tool = ui.use('tool')

  return (
    <nav
      aria-label='Tools'
      className={clsx(
        glass,
        'flex items-center',
        // On phones, the rest of the bottom edge beside the app drawer button;
        // centered on tablets, where there's room.
        'max-lg:absolute max-lg:bottom-3.5 max-lg:p-1',
        'max-sm:left-[4.25rem] max-sm:right-3',
        'sm:max-lg:bottom-6 sm:max-lg:left-1/2 sm:max-lg:-translate-x-1/2',
      )}>
      <ToggleGroup
        value={[tool]}
        onValueChange={([next]) => next && api.setTool(next)}
        className='flex flex-1 justify-between gap-1'>
        {TOOL_ORDER.map((id) => {
          const { label, Icon } = TOOLS[id]
          const keys = TOOL_KEYS[id].toUpperCase()
          return (
            <Tip
              key={id}
              label={label}
              keys={id === 'move' ? `${keys} · or hold ${MOD_LABEL}` : keys}>
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
          )
        })}
      </ToggleGroup>
    </nav>
  )
}
