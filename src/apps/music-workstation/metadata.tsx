import { IconFrame } from 'src/components'
import type { AppMetadata } from 'src/lib/types'

export const metadata: AppMetadata = {
  id: 'music-workstation',
  name: 'Music Workstation',
  summary: 'Sequence beats on the OP-1 Field',
  description:
    'Program patterns and make amazing looping sound. Based on Teenage Engineering OP-1 Field sequencers.',
  type: 'music',
  Icon: AppIcon,
  dark: false,
}

export function AppIcon(props: React.ComponentProps<typeof IconFrame>) {
  return (
    <IconFrame fill='#979797' wip={metadata.wip} {...props}>
      <defs colorInterpolationFilters='sRGB'>
        <filter id='darken'>
          <feComponentTransfer>
            <feFuncR type='linear' slope='0.75' />
            <feFuncG type='linear' slope='0.75' />
            <feFuncB type='linear' slope='0.75' />
          </feComponentTransfer>
        </filter>

        <filter id='lighten'>
          <feComponentTransfer>
            <feFuncR type='linear' slope='0.62' intercept='0.38' />
            <feFuncG type='linear' slope='0.62' intercept='0.38' />
            <feFuncB type='linear' slope='0.62' intercept='0.38' />
          </feComponentTransfer>
        </filter>
      </defs>

      <ellipse cx='50.5' cy='62' fill='#A1A3A5' rx='32.5' ry='25' />
      <ellipse cx='50.5' cy='59' fill='#CDD0C3' rx='32.5' ry='25' />
      <path
        fill='#B7B9B4'
        d='M67 80.54C62.163 82.737 56.524 84 50.5 84c-6.024 0-11.663-1.263-16.5-3.46V60h33v20.54Z'
      />
      <path
        fill='#6C7A84'
        d='M34 59.986V42.014C34 35.93 41.387 31 50.5 31S67 35.931 67 42.014v17.971C67 66.07 59.613 71 50.5 71S34 66.069 34 59.986Z'
      />
      <path
        fill='#A1A3A5'
        d='M31 54.232V31.768C31 24.164 39.954 18 51 18s20 6.164 20 13.768v22.464C71 61.836 62.046 68 51 68s-20-6.164-20-13.768Z'
      />
      <ellipse cx='51' cy='32' fill='#CDD0C3' rx='20' ry='16' />

      <ellipse
        cx='50.5'
        cy='28.5'
        fill='#EF3E23'
        filter='url(#darken)'
        rx='16.5'
        ry='12.5'
      />
      <g className='group-act/icon:translate-y-[3px] transition-transform'>
        <ellipse cx='50.5' cy='25.5' fill='#EF3E23' rx='16.5' ry='12.5' />
        <path
          fill='#EF3E23'
          filter='url(#lighten)'
          d='M50.5 13C59.61 13 67 18.6 67 25.5 67 19.15 59.61 14 50.5 14S34 19.15 34 25.5C34 18.6 41.39 13 50.5 13'
        />
      </g>
    </IconFrame>
  )
}
