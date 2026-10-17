import { AnimatePresence, motion } from 'motion/react'

import { data, doc, ui } from '../lib'
import { About } from './About'
import { Actions } from './Header'
import { SamCam } from './SamCam'
import { Section } from './ui'

const row =
  'flex h-8 items-center justify-between gap-3 px-3 text-xs text-neutral-300'

/** The file and what it holds, then the SAM Cam and About. Large screens only. */
export function Inspector() {
  const smart = ui.use((s) => s.tool === 'smart')

  return (
    <aside className='no-scrollbar flex flex-col overflow-y-auto max-lg:hidden lg:col-start-3 lg:row-span-2 lg:row-start-1'>
      <Actions className='h-12 shrink-0 justify-end px-3' />
      <Section title='Model'>
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

const bytes = (n: number) =>
  n < 1e6 ? `${Math.round(n / 1e3)} KB` : `${(n / 1e6).toFixed(1)} MB`

/** Three significant digits, so 0.214 and 1,250 both read at a glance. */
const measure = (n: number) =>
  n.toLocaleString(undefined, { maximumSignificantDigits: 3 })

function Stats() {
  ui.use((s) => s.mesh) // a new model, even under the same name
  const name = doc.use((s) => s.name)
  const { format, bytes: size, size: extent, materials, textures } = data.info
  if (!name) return null
  // glTF is in meters; OBJ, PLY and STL don't say.
  const unit = format === 'GLB' || format === 'GLTF' ? ' m' : ''

  const stats: [string, string][] = [
    ['Name', name],
    ['File', `${format}, ${bytes(size)}`],
    ['Size', extent.map(measure).join(' × ') + unit],
    ['Parts', data.parts.length.toLocaleString()],
    ['Vertices', data.labels.length.toLocaleString()],
    ['Faces', (data.triangles.length / 3).toLocaleString()],
    ['Materials', materials.toLocaleString()],
    ['Textures', textures ? textures.toLocaleString() : 'None'],
  ]

  return (
    <dl>
      {stats.map(([label, value]) => (
        <div key={label} className={row}>
          <dt>{label}</dt>
          <dd title={value} className='truncate tabular-nums text-neutral-500'>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
