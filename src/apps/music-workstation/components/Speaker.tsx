import { Base } from './Base'

const COLS = 13 // holes per row
const ROWS = 13 // holes per column
const SPACING = 10 // distance between hole centers
const CORNER_CUT = 3 // how many holes to trim at each corner (L-shape)
const HOLE_RADIUS = 3
const PADDING = 3.5 // viewBox margin around the grid

export function Speaker() {
  const width = (COLS - 1) * SPACING + PADDING * 2
  const height = (ROWS - 1) * SPACING + PADDING * 2

  return (
    <Base className='col-span-4 row-span-4 p-4'>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox={`${-PADDING} ${-PADDING} ${width} ${height}`}
        fill='none'>
        <defs>
          <filter
            id='blur'
            x='-3.8'
            y='-3.8'
            width='7.6'
            height='7.6'
            filterUnits='userSpaceOnUse'
            colorInterpolationFilters='sRGB'>
            <feFlood floodOpacity='0' result='BackgroundImageFix' />
            <feBlend
              mode='normal'
              in='SourceGraphic'
              in2='BackgroundImageFix'
              result='shape'
            />
            <feGaussianBlur
              stdDeviation='0.15'
              result='effect1_foregroundBlur'
            />
          </filter>
          <linearGradient
            id='gradient'
            x1='-3'
            y1='-2'
            x2='2.5'
            y2='2.5'
            gradientUnits='userSpaceOnUse'>
            <stop stopColor='#404040' /> <stop offset='1' stopColor='white' />
          </linearGradient>
          <g id='hole'>
            <g filter='url(#blur)'>
              <circle cx='0' cy='0' r={HOLE_RADIUS} fill='#192024' />
              <circle
                cx='0'
                cy='0'
                r={HOLE_RADIUS + 0.25}
                stroke='url(#gradient)'
                strokeWidth='0.5'
              />
            </g>
          </g>
        </defs>

        {Array.from({ length: ROWS }).map((_, y) =>
          Array.from({ length: COLS }).map((_, x) => {
            // Skip corner L-shapes, scaled to grid size
            const isRowEdge =
              (y === 0 || y === ROWS - 1) &&
              (x < CORNER_CUT || x > COLS - 1 - CORNER_CUT)
            const isColumnEdge =
              (x === 0 || x === COLS - 1) &&
              (y < CORNER_CUT || y > ROWS - 1 - CORNER_CUT)

            if (isRowEdge || isColumnEdge) return null

            return (
              <use
                key={`${y},${x}`}
                href='#hole'
                transform={`translate(${x * SPACING} ${y * SPACING})`}
              />
            )
          }),
        )}
      </svg>
    </Base>
  )
}
