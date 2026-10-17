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

export function AppIcon(props: React.ComponentProps<typeof IconFrame>) {
  return <IconFrame fill='#16161a' {...props} />
}
