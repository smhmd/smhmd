import { Menu } from '@base-ui/react/menu'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { Toolbar } from '@base-ui/react/toolbar'
import clsx from 'clsx'

import {
  CenterFocus,
  Check,
  Circle,
  FlipToBack,
  GridOn,
  Language,
  Texture,
  ViewInAr,
} from 'src/icons'

import { api, type Shading, ui } from '../lib'
import { button, island, item, Tip } from './ui'

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

/** What both the toolbar and the phone menu show. */
function useViewState() {
  return {
    fit: ui.use((s) => (s.part >= 0 ? 'Fit Part to View' : 'Fit to View')),
    xray: ui.use('xray'),
    grid: ui.use('grid'),
    shading: ui.use('shading'),
  }
}

/**
 * How you're looking at the model, top right of the canvas on large screens:
 * fitting it to view, the overlays (X-ray, grid), and one shading at a time,
 * as in Blender's viewport header. Phones get the same as a menu.
 */
export function View() {
  const { fit, xray, grid, shading } = useViewState()

  return (
    <Toolbar.Root
      aria-label='View'
      className={clsx(
        island,
        'absolute right-3 top-3 flex items-center gap-1 p-1 max-lg:hidden',
      )}>
      <Tip label={fit} keys='F'>
        <Toolbar.Button
          aria-label={fit}
          className={button}
          onClick={api.fitSelection}>
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
        onValueChange={([next]) => next && api.setShading(next)}
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

const check = 'ml-auto size-4 fill-current'

/** The View toolbar as one menu, for phones, beside Open and Export. */
export function ViewMenu() {
  const { fit, xray, grid, shading } = useViewState()

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label='View'
        className={clsx(button, 'data-popup-open:bg-white/12')}>
        <ViewInAr aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side='bottom' align='end' sideOffset={8}>
          <Menu.Popup className={clsx(island, 'min-w-52 p-1.5 outline-none')}>
            <Menu.Item
              className={clsx(item, 'h-10')}
              onClick={api.fitSelection}>
              <CenterFocus aria-hidden className='size-4 fill-current' />
              {fit}
            </Menu.Item>
            <Menu.CheckboxItem
              className={clsx(item, 'h-10')}
              checked={xray}
              onCheckedChange={() => api.toggle('xray')}>
              <FlipToBack aria-hidden className='size-4 fill-current' />
              X-ray
              <Menu.CheckboxItemIndicator className={check}>
                <Check aria-hidden />
              </Menu.CheckboxItemIndicator>
            </Menu.CheckboxItem>
            <Menu.CheckboxItem
              className={clsx(item, 'h-10')}
              checked={grid}
              onCheckedChange={() => api.toggle('grid')}>
              <GridOn aria-hidden className='size-4 fill-current' />
              Grid
              <Menu.CheckboxItemIndicator className={check}>
                <Check aria-hidden />
              </Menu.CheckboxItemIndicator>
            </Menu.CheckboxItem>
            <Menu.Separator className='bg-white/8 mx-1 my-1.5 h-px' />
            <Menu.Group>
              <Menu.GroupLabel className='px-2 pb-1 pt-0.5 text-[11px] text-neutral-500'>
                Shading
              </Menu.GroupLabel>
              <Menu.RadioGroup
                value={shading}
                onValueChange={(next) => api.setShading(next as Shading)}>
                {SHADING.map(({ id, label, Icon }) => (
                  <Menu.RadioItem
                    key={id}
                    value={id}
                    className={clsx(item, 'h-10')}>
                    <Icon aria-hidden className='size-4 fill-current' />
                    {label}
                    <Menu.RadioItemIndicator className={check}>
                      <Check aria-hidden />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
