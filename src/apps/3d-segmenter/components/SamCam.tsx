import { useLayoutEffect, useRef } from 'react'

import { TAU } from 'src/lib/math'

import {
  BACKGROUND,
  type Box,
  doc,
  type Point,
  prompts,
  ui,
  view,
} from '../lib'
import { Section } from './ui'

const BUSY = {
  moving: 'Analyzing…',
  encoding: 'Analyzing…',
  decoding: 'Segmenting…',
}

/** What the model actually sees: the last frame sent to EdgeTAM, its raw 2D mask, and your clicks. */
export function SamCam() {
  const frame = ui.use((s) => s.frame)
  const status = ui.use((s) => s.status)
  const color = doc.use(
    (s) => s.classes.find((c) => c.id === s.active)?.color ?? '#ffffff',
  )
  const { points, box } = prompts.use()
  const canvas = useRef<HTMLCanvasElement>(null)

  // Before paint, so a new frame never flashes at the old size.
  useLayoutEffect(() => {
    if (canvas.current) draw(canvas.current, color, points, box)
  }, [frame, color, points, box])

  return (
    <Section title='SAM Cam'>
      {/* A fixed screen in the frame's own gray, so letterboxing is invisible and it never jumps. */}
      <div
        className='ring-white/6 aspect-4/3 relative mx-3 overflow-hidden rounded-md ring-1'
        style={{ background: BACKGROUND }}>
        <canvas ref={canvas} aria-hidden className='size-full object-contain' />
        {status in BUSY && (
          <span className='text-xxs absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-neutral-300'>
            {BUSY[status as keyof typeof BUSY]}
          </span>
        )}
      </div>
      <p className='px-3 pb-3 pt-2 text-[11px] leading-snug text-neutral-500'>
        Powered by EdgeTAM, a 20 MB model built for mobile.
      </p>
    </Section>
  )
}

function draw(
  canvas: HTMLCanvasElement,
  color: string,
  points: Point[],
  box: Box | null,
) {
  const { frame, mask, width, height } = view
  const ctx = canvas.getContext('2d')
  if (!ctx || !frame) return
  canvas.width = width
  canvas.height = height
  ctx.putImageData(frame, 0, 0)

  if (mask.length === width * height) {
    const overlay = new ImageData(width, height)
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
    for (let i = 0; i < mask.length; i++)
      if (mask[i]) overlay.data.set([r, g, b, 150], i * 4)
    // putImageData replaces pixels, so blend the mask in through a second canvas.
    const layer = new OffscreenCanvas(width, height)
    layer.getContext('2d')!.putImageData(overlay, 0, 0)
    ctx.drawImage(layer, 0, 0)
  }

  const radius = Math.max(4, width / 120)
  if (box) {
    ctx.setLineDash([radius, radius])
    ctx.lineWidth = radius / 2
    ctx.strokeStyle = '#ffffff'
    ctx.strokeRect(box[0], box[1], box[2] - box[0], box[3] - box[1])
    ctx.setLineDash([])
  }

  for (const { x, y, positive } of points) {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, TAU)
    ctx.fillStyle = positive ? '#22c55e' : '#ef4444'
    ctx.fill()
    ctx.lineWidth = radius / 2
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
  }
}
