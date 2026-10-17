import { IconFrame } from 'src/components'
import type { AppMetadata } from 'src/lib/types'

export const metadata: AppMetadata = {
  id: '3d-segmenter',
  name: '3D Segmenter',
  summary: 'Segment 3D meshes with on-device AI',
  description:
    'Click to segment 3D meshes with EdgeTAM running in your browser. Paint, refine, and export Supervisely-ready labels. Nothing leaves your device.',
  type: 'utility',
  Icon: AppIcon,
  dark: true,
}

/** A street scene, already segmented: every object one flat class color. */
export function AppIcon(props: React.ComponentProps<typeof IconFrame>) {
  return (
    <IconFrame fill='#4a88ad' {...props}>
      <path d='M0 50 L100 42 V100 H0Z' fill='#5fae55' />
      <path d='M30 100 L66 43 L72 43 L104 100Z' fill='#5a2394' />
      <g fill='#2f7d45'>
        <circle cx='20' cy='33' r='12' />
        <circle cx='31' cy='28' r='10' />
        <rect x='23' y='36' width='4' height='16' rx='1' />
      </g>
      <g fill='#f4d34a'>
        <rect x='62' y='53' width='22' height='13' rx='4' />
        <path d='M66 54 L69 47 H77 L80 54Z' />
        <rect x='59' y='52' width='4' height='3' rx='1.5' />
        <rect x='83' y='52' width='4' height='3' rx='1.5' />
        <rect x='64' y='64' width='5' height='6' rx='1.5' />
        <rect x='77' y='64' width='5' height='6' rx='1.5' />
      </g>
      <g fill='#d63b2f'>
        <circle cx='30' cy='59' r='5.5' />
        <rect x='23' y='66' width='14' height='22' rx='6' />
        <rect x='24' y='80' width='5' height='20' rx='2.5' />
        <rect x='31' y='80' width='5' height='20' rx='2.5' />
      </g>
    </IconFrame>
  )
}
