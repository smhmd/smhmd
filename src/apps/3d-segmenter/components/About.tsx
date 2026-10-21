import { Dialog } from '@base-ui/react/dialog'
import clsx from 'clsx'

import { Help } from 'src/icons'

import { MOD_LABEL, REDO_KEYS, SAMPLE, TOOLS, UNDO_KEYS } from '../lib'
import { button, small, Tip } from './ui'

const steps = [
  [
    'Smart Select',
    'Box or click an object and EdgeTAM outlines it, on your device. ⌥-click to exclude.',
  ],
  [
    'Fill',
    'Fills the surface under the ring, stopping at folds and other labels.',
  ],
  ['Brush & Eraser', 'Touch up the edges.'],
  ['X-ray', 'See through labels to reach what’s behind them.'],
  [
    'Export',
    'A Supervisely mesh project (.tar), ready to import, or to open here again.',
  ],
]

const keys = [
  [
    TOOLS.map((t) => t.key.toUpperCase()).join(' '),
    TOOLS.map((t) => t.label).join(', '),
  ],
  ['1–9', 'Pick a class'],
  ['[  ]', 'Ring size (or scroll)'],
  [MOD_LABEL, 'Hold to orbit with any tool'],
  ['⇧', 'Hold with Fill for the whole piece'],
  ['space  esc', 'Apply, cancel'],
  [`${UNDO_KEYS}  ${REDO_KEYS}`, 'Undo, redo'],
  ['F  X  G', 'Fit to view, X-ray, grid'],
  ['T  W', 'Textures, wireframe'],
]

const heading = 'mt-5 mb-2 text-xs font-medium text-neutral-500'

/** The right panel's footer button: what this is, how to drive it, and the sample's credit. Large screens only. */
export function About() {
  return (
    <footer className='border-white/6 flex h-10 shrink-0 items-center justify-end border-t px-1.5'>
      <Dialog.Root>
        <Tip label='About 3D Segmenter'>
          <Dialog.Trigger
            aria-label='About 3D Segmenter'
            className={clsx(button, small)}>
            <Help aria-hidden />
          </Dialog.Trigger>
        </Tip>
        <Dialog.Portal>
          <Dialog.Backdrop className='data-open:animate-fade-in data-closed:animate-fade-out backdrop-blur-xs fixed inset-0 bg-black/60' />
          <Dialog.Popup className='data-open:animate-fade-in data-closed:animate-fade-out no-scrollbar -translate-1/2 fixed left-1/2 top-1/2 max-h-[85dvh] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl bg-neutral-900 p-6 text-[13px] leading-relaxed text-neutral-300 shadow-2xl outline-none ring-1 ring-white/10'>
            <Dialog.Title className='text-base font-semibold text-white'>
              3D Segmenter
            </Dialog.Title>
            <Dialog.Description className='mt-1 text-neutral-400'>
              Label 3D meshes for segmentation datasets, entirely in your
              browser. Nothing is uploaded.
            </Dialog.Description>

            <h3 className={heading}>Tools</h3>
            <ol className='flex flex-col gap-2'>
              {steps.map(([title, text]) => (
                <li key={title}>
                  <b className='font-medium text-neutral-100'>{title}.</b>{' '}
                  {text}
                </li>
              ))}
            </ol>

            <h3 className={heading}>Shortcuts</h3>
            <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5'>
              {keys.map(([combo, what]) => (
                <div key={combo} className='contents'>
                  <dt>
                    <kbd className='whitespace-pre font-sans text-neutral-100'>
                      {combo}
                    </kbd>
                  </dt>
                  <dd className='text-neutral-400'>{what}</dd>
                </div>
              ))}
            </dl>

            <p className='mt-5 text-xs text-neutral-500'>
              Sample model: {SAMPLE.credit}.
            </p>
            <Dialog.Close className='hocus:bg-neutral-200 mt-5 h-8 w-full cursor-pointer rounded-lg bg-white text-xs font-medium text-neutral-950 outline-none focus-visible:ring-2 focus-visible:ring-white/40'>
              Got It
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </footer>
  )
}
