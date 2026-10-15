import { AnimatePresence, motion } from 'motion/react'

import { api, data, type Option, ui } from '../lib'
import { About } from './About'
import { SamCam } from './SamCam'
import { Range, Section, Toggle } from './ui'

const row =
  'flex h-9 items-center justify-between gap-3 px-3 text-xs text-neutral-300'

/** Viewport settings and model facts, Spline-style. Large screens only. */
export function Inspector() {
  const smart = ui.use((s) => s.tool === 'smart')

  return (
    <aside className='no-scrollbar flex flex-col overflow-y-auto max-lg:hidden lg:col-start-3 lg:row-span-2 lg:row-start-1'>
      <div className='h-12 shrink-0' />
      <Section title='View'>
        <Switch option='grid' label='Grid' keys='G' />
        <Switch option='textures' label='Textures' keys='T' />
        <Switch option='wireframe' label='Wireframe' keys='W' />
        <Switch option='rotate' label='Auto-rotate' />
        <div className={row}>
          Label opacity
          <div className='w-24'>
            <Opacity />
          </div>
        </div>
      </Section>
      <Section title='Model' className='border-white/6 mt-2 border-t'>
        <Stats />
      </Section>
      {/* Anchored to the bottom, so it can come and go without moving anything above. */}
      <div className='mt-auto'>
        <AnimatePresence initial={false}>
          {smart && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className='border-white/6 border-t'>
              <SamCam />
            </motion.div>
          )}
        </AnimatePresence>
        <About />
      </div>
    </aside>
  )
}

export function Size({ vertical }: { vertical?: boolean }) {
  const radius = ui.use((s) => s.radius)
  return (
    <Range
      label='Brush size'
      value={radius}
      min={4}
      max={120}
      vertical={vertical}
      onChange={api.setRadius}
    />
  )
}

function Opacity() {
  const opacity = ui.use((s) => s.opacity)
  return (
    <Range
      label='Label opacity'
      value={opacity}
      min={0.1}
      max={1}
      step={0.05}
      onChange={api.setOpacity}
    />
  )
}

function Switch({
  option,
  label,
  keys,
}: {
  option: Option
  label: string
  keys?: string
}) {
  const checked = ui.use((s) => s[option])
  return (
    <label className={`${row} cursor-pointer`}>
      <span>
        {label}
        {keys && (
          <kbd className='ml-1.5 font-sans text-neutral-600'>{keys}</kbd>
        )}
      </span>
      <Toggle checked={checked} onChange={() => api.toggle(option)} />
    </label>
  )
}

function Stats() {
  ui.use((s) => s.mesh)
  const stats = [
    ['Parts', data.parts.length],
    ['Vertices', data.labels.length],
    ['Faces', (data.geometry?.index?.count ?? 0) / 3],
  ]

  return (
    <dl>
      {stats.map(([label, value]) => (
        <div key={label} className={row}>
          <dt>{label}</dt>
          <dd className='tabular-nums text-neutral-500'>
            {value.toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  )
}
