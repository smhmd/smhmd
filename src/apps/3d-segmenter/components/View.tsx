import { CenterFocus, FlipToBack } from 'src/icons'

import { api, data, ui } from '../lib'
import { IconButton } from './ui'

/** How you're looking at the model, top-right of the canvas; on phones, below the Open/Export card. */
export function View() {
  const part = ui.use((s) => s.part)
  const xray = ui.use((s) => s.xray)

  return (
    <div className='absolute right-3 top-[4.5rem] flex flex-col gap-1 rounded-xl bg-black/40 p-1 backdrop-blur-md lg:top-3'>
      <IconButton
        label={part >= 0 ? 'Fit Part to View' : 'Fit to View'}
        keys='F'
        onClick={() => api.fit(data.parts[part])}>
        <CenterFocus aria-hidden />
      </IconButton>
      <IconButton
        label='X-ray'
        keys='X'
        aria-pressed={xray}
        className='aria-pressed:bg-white/12 aria-pressed:text-white'
        onClick={() => api.toggle('xray')}>
        <FlipToBack aria-hidden />
      </IconButton>
    </div>
  )
}
