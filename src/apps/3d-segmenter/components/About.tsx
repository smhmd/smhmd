import { Dialog } from '@base-ui/react/dialog'
import clsx from 'clsx'

import { Help } from 'src/icons'

import { SAMPLE, useMod } from '../lib'
import { button, small, Tip } from './ui'

const steps = (mod: string) => [
  [
    'Smart Select',
    'Drag a box around an object, or click it, and it’s labeled with the active class. EdgeTAM, a mobile-sized Segment Anything 2, outlines it on your device and the app maps the outline onto the vertices you can see. Click to add, ⌥-click (or long-press) to exclude, press a class number to relabel. The points only exist in this view, so rotating or drawing a new box starts the next selection.',
  ],
  [
    'Fill',
    'A brush that respects the shape: hover to preview, then click or drag to fill the surface inside the ring, up to folds (between teeth, at a knuckle) and other classes. Scroll to resize. Hold ⇧ (or long-press) for the whole connected piece.',
  ],
  [
    'Brush & Eraser',
    `Touch up the edges. Hold ${mod}, right-drag or use two fingers to orbit.`,
  ],
  [
    'X-ray',
    'Press X to make every label see-through, so you can label what’s behind it. New labels turn see-through too once a stroke ends or a selection is applied, so you can keep peeling layers. See-through labels can’t be painted over.',
  ],
  [
    'Parts',
    'The pieces the model file came with. Label one whole, hide it to reach what’s behind, or select it to outline it and fit it to view.',
  ],
  [
    'Export',
    'A per-vertex PLY and meta.json that import straight into Supervisely.',
  ],
]

const keys = ({ mod, key, shift }: ReturnType<typeof useMod>) => [
  ['V S L B E', 'Move, smart select, fill, brush, eraser'],
  ['⌥ click', 'Exclude from a selection'],
  ['⇧', 'Hold with Fill for the whole connected piece'],
  ['1–9', 'Pick a class'],
  ['Scroll  [  ]', 'Brush and Fill size'],
  ['X', 'X-ray: see through labels'],
  [mod, 'Hold to orbit or zoom with any tool'],
  ['space  ↵', 'Apply the selection'],
  ['space while boxing', 'Move the box'],
  ['esc', 'Cancel the drag or selection, or deselect the part'],
  [`${key('Z')}  ${shift('Z')}`, 'Undo, redo'],
  ['F', 'Fit the selected part, or everything, to view'],
  ['G  T  W', 'Grid, textures, wireframe'],
]

const heading = 'mt-5 mb-2 text-xs font-medium text-neutral-500'

/** Panel footer button: what this is, how to drive it, and the sample's credit. */
export function About({ className }: { className?: string }) {
  const mod = useMod()
  return (
    <footer
      className={clsx(
        'border-white/6 flex h-10 shrink-0 items-center justify-end border-t px-1.5',
        className,
      )}>
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

            <h3 className={heading}>How It Works</h3>
            <ol className='flex flex-col gap-2'>
              {steps(mod.mod).map(([title, text]) => (
                <li key={title}>
                  <b className='font-medium text-neutral-100'>{title}.</b>{' '}
                  {text}
                </li>
              ))}
            </ol>

            <h3 className={heading}>Shortcuts</h3>
            <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5'>
              {keys(mod).map(([combo, what]) => (
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
