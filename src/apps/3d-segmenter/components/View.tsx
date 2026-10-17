import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { Toolbar } from '@base-ui/react/toolbar'
import clsx from 'clsx'

import {
  CenterFocus,
  Circle,
  FlipToBack,
  GridOn,
  Language,
  Texture,
} from 'src/icons'

import { api, data, type Shading, ui } from '../lib'
import { button, Tip } from './ui'

const on = 'aria-pressed:bg-white/12 aria-pressed:text-white'

const SHADING: {
  id: Shading
  label: string
  keys?: string
  Icon: typeof Circle
}[] = [
  { id: 'solid', label: 'Solid', Icon: Circle },
  { id: 'textures', label: 'Textures', keys: 'T', Icon: Texture },
  { id: 'wireframe', label: 'Wireframe', keys: 'W', Icon: Language },
]

/**
 * How you're looking at the model, top right of the canvas: fitting it to
 * view, the overlays (X-ray, grid), and one shading at a time, as in
 * Blender's viewport header. On phones, below the Open/Export card.
 */
export function View() {
  const part = ui.use((s) => s.part)
  const xray = ui.use((s) => s.xray)
  const grid = ui.use((s) => s.grid)
  const shading = ui.use((s) => s.shading)

  return (
    <Toolbar.Root
      aria-label='View'
      className='absolute right-3 top-[4.5rem] flex items-center gap-1 rounded-xl bg-black/40 p-1 backdrop-blur-md lg:top-3'>
      <Tip label={part >= 0 ? 'Fit Part to View' : 'Fit to View'} keys='F'>
        <Toolbar.Button
          aria-label={part >= 0 ? 'Fit Part to View' : 'Fit to View'}
          className={button}
          onClick={() => api.fit(data.parts[part])}>
          <CenterFocus aria-hidden />
        </Toolbar.Button>
      </Tip>
      <Tip label='X-ray' keys='X'>
        <Toolbar.Button
          aria-label='X-ray'
          aria-pressed={xray}
          className={clsx(button, on)}
          onClick={() => api.toggle('xray')}>
          <FlipToBack aria-hidden />
        </Toolbar.Button>
      </Tip>
      <Tip label='Grid' keys='G'>
        <Toolbar.Button
          aria-label='Grid'
          aria-pressed={grid}
          className={clsx(button, on)}
          onClick={() => api.toggle('grid')}>
          <GridOn aria-hidden />
        </Toolbar.Button>
      </Tip>
      <Toolbar.Separator className='bg-white/12 mx-0.5 h-5 w-px' />
      <ToggleGroup
        aria-label='Shading'
        value={[shading]}
        onValueChange={([next]) => next && api.setShading(next as Shading)}
        className='flex gap-1'>
        {SHADING.map(({ id, label, keys, Icon }) => (
          <Tip key={id} label={label} keys={keys}>
            <Toolbar.Button
              render={<Toggle value={id} />}
              aria-label={label}
              className={button}>
              <Icon aria-hidden />
            </Toolbar.Button>
          </Tip>
        ))}
      </ToggleGroup>
    </Toolbar.Root>
  )
}
