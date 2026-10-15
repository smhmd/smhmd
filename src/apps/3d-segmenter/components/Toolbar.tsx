import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import clsx from 'clsx'

import { AutoFix, Brush, ColorReset, PanTool } from 'src/icons'

import { api, type Tool, ui } from '../lib'
import { button, glass, Tip } from './ui'

export const TOOLS: {
  id: Tool
  label: string
  keys: string
  Icon: typeof Brush
}[] = [
  { id: 'move', label: 'Move', keys: 'V · or hold Space', Icon: PanTool },
  { id: 'smart', label: 'Smart select', keys: 'S', Icon: AutoFix },
  { id: 'brush', label: 'Brush', keys: 'B', Icon: Brush },
  { id: 'erase', label: 'Eraser', keys: 'E', Icon: ColorReset },
]

export function Toolbar() {
  const tool = ui.use((s) => s.tool)

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
        {TOOLS.map(({ id, label, keys, Icon }) => (
          <Tip key={id} label={label} keys={keys}>
            <Toggle value={id} aria-label={label} className={button}>
              <Icon aria-hidden />
            </Toggle>
          </Tip>
        ))}
      </ToggleGroup>
    </nav>
  )
}
