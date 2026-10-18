import { IconFrame } from 'src/components'
import type { AppMetadata } from 'src/lib/types'

export const metadata: AppMetadata = {
  id: 'dice-roll',
  name: '3D Dice Roll',
  summary: 'The best tabletop dice rolling experience',
  description:
    'The best tabletop 3D dice rolling experience! D4, D6, D8, D10, D12, D20, and D100. Real physics.',
  type: 'utility',
  Icon: AppIcon,
  dark: true,
}

export function AppIcon(props: React.ComponentProps<typeof IconFrame>) {
  return (
    <IconFrame fill='#18212F' {...props}>
      <g
        fill='none'
        className='group-act/icon:rotate-180 origin-center transition-transform duration-500'>
        <path fill='#FFD166' d='m71.01 29.92-20.93 19.2-28.24-7L42.8 21.95z' />
        <path
          fill='#E76F51'
          d='m29.48 70.04-7.47-27.88 28.07 6.96 6.95 29.07z'
        />
        <path
          fill='#3B86FF'
          d='M78.04 58.06 71 29.92l-20.93 19.2 6.95 29.07z'
        />
        <g stroke='white'>
          <path d='m77.97 58.04-7.03-28.19-27.96-8-20.94 20.2 7.03 28.19 27.96 8z' />
          <path d='m68.9 57.1-32.27 8.05M68.9 57.1 45.62 32.46l-9 32.69m32.29-8.05 9.06.94m-41.34 7.1-7.56 5.1m16.55-37.77-2.64-10.61' />
          <path
            strokeLinecap='round'
            d='M68.42 56.95 56.86 77.53 36.99 64.79l-14.2-22.5 22.96-9.33L70.4 30.4z'
          />
        </g>
      </g>
    </IconFrame>
  )
}
