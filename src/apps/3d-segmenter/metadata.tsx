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
  wip: true,
}

export function AppIcon(props: React.ComponentProps<typeof IconFrame>) {
  return (
    <IconFrame fill='#141416' wip={metadata.wip} {...props}>
      <path fill='#3a3836' d='M50 18 82 40 74 78 30 82 18 44Z' />
      <path fill='#e69f00' d='M50 18 82 40 74 78 50 50Z' />
      <path
        fill='none'
        stroke='#ffffff40'
        strokeWidth='1.5'
        strokeLinejoin='round'
        d='M50 18 82 40 74 78 30 82 18 44Z M50 50 50 18M50 50 82 40M50 50 74 78M50 50 30 82M50 50 18 44'
      />
      <circle
        cx='64'
        cy='46'
        r='5'
        fill='#22c55e'
        stroke='#fff'
        strokeWidth='2'
        className='group-act/icon:scale-125 origin-[64px_46px] transition-transform'
      />
    </IconFrame>
  )
}
