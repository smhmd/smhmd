import type { SVGIcon } from 'src/lib/types'

/**
 * Key glyphs lifted from the OP-1 Field's print (see icons.svg): hairline
 * 1.5-unit strokes, each centered in a 40-unit box so they all print at the
 * same scale. Ink is `currentColor`; record keeps its orange.
 */
function glyph(viewBox: string, children: React.ReactNode): SVGIcon {
  function Glyph(props: React.ComponentProps<'svg'>) {
    return (
      <svg
        viewBox={viewBox}
        width='1em'
        height='1em'
        fill='none'
        strokeLinecap='round'
        strokeLinejoin='round'
        {...props}>
        {children}
      </svg>
    )
  }
  return Glyph
}

export const DotsGlyph = glyph(
  '817 60 40 40',
  <>
    <circle cx='825' cy='83.5' r='2.5' fill='currentColor' />
    <circle cx='833' cy='76.5' r='2.5' fill='currentColor' />
    <circle cx='841' cy='83.5' r='2.5' fill='currentColor' />
    <circle cx='849' cy='83.5' r='2.5' fill='currentColor' />
  </>,
)

// Drawn to match the sheet: 1.5 strokes, ~20 units of ink in a 40-unit box.
/** A hexagonal cage holding a note. */
export const TombolaGlyph = glyph(
  '0 0 40 40',
  <>
    <path
      d='M20 8L30.39 14V26L20 32L9.61 26V14Z'
      stroke='currentColor'
      strokeWidth='1.5'
    />
    <circle cx='20' cy='26' r='2.5' fill='currentColor' />
  </>,
)

/** Four step cells, two of them holding notes. */
export const PatternGlyph = glyph(
  '0 0 40 40',
  <>
    <rect
      x='6'
      y='12'
      width='28'
      height='16'
      rx='2'
      stroke='currentColor'
      strokeWidth='1.5'
    />
    <path
      d='M13 12v16M20 12v16M27 12v16'
      stroke='currentColor'
      strokeWidth='1.5'
    />
    <circle cx='9.5' cy='20' r='2' fill='currentColor' />
    <circle cx='23.5' cy='20' r='2' fill='currentColor' />
  </>,
)

export const ExportGlyph = glyph(
  '321 61 40 40',
  <>
    <path d='M332 92H350' stroke='currentColor' strokeWidth='1.5' />
    <path d='M341 70V87' stroke='currentColor' strokeWidth='1.5' />
    <path d='M350 79L341 88L332 79' stroke='currentColor' strokeWidth='1.5' />
  </>,
)

export const ForwardGlyph = glyph(
  '444 62 40 40',
  <>
    <path d='M454 82H474' stroke='currentColor' strokeWidth='1.5' />
    <path
      d='M465.5 91L474.5 82L465.5 73'
      stroke='currentColor'
      strokeWidth='1.5'
    />
  </>,
)

export const BackGlyph = glyph(
  '508 62 40 40',
  <>
    <path d='M518 82H538' stroke='currentColor' strokeWidth='1.5' />
    <path
      d='M526.5 91L517.5 82L526.5 73'
      stroke='currentColor'
      strokeWidth='1.5'
    />
  </>,
)

export const ClearGlyph = glyph(
  '570 61.5 40 40',
  <>
    <path
      d='M579.981 84.147L602.769 75.853'
      stroke='currentColor'
      strokeWidth='1.5'
    />
    <path
      d='M579.981 78.853L602.769 87.147'
      stroke='currentColor'
      strokeWidth='1.5'
    />
    <circle
      cx='581'
      cy='75.5'
      r='3.5'
      stroke='currentColor'
      strokeWidth='1.5'
    />
    <circle
      cx='581'
      cy='87.5'
      r='3.5'
      stroke='currentColor'
      strokeWidth='1.5'
    />
  </>,
)

export const RecordGlyph = glyph(
  '569 124 40 40',
  <>
    <circle cx='589' cy='144' r='9' fill='#F24B00' />
  </>,
)

export const PlayGlyph = glyph(
  '632.5 124 40 40',
  <>
    <path
      d='M645.735 135.89L660.169 143.558C660.523 143.746 660.523 144.254 660.169 144.442L645.735 152.11C645.402 152.287 645 152.045 645 151.668V136.332C645 135.955 645.402 135.713 645.735 135.89Z'
      fill='currentColor'
    />
  </>,
)

export const StopGlyph = glyph(
  '693 124 40 40',
  <>
    <rect x='706' y='137' width='14' height='14' rx='0.5' fill='currentColor' />
  </>,
)

export const RestGlyph = glyph(
  '259 135.5 40 40',
  <>
    <circle cx='270' cy='155.5' r='1.5' fill='currentColor' />
    <circle cx='276' cy='155.5' r='1.5' fill='currentColor' />
    <circle cx='282' cy='155.5' r='1.5' fill='currentColor' />
    <circle cx='288' cy='155.5' r='1.5' fill='currentColor' />
  </>,
)

/** Numerals 1–9. */
export const DIGITS = [
  glyph(
    '152.5 427.75 40 40',
    <path d='M172.5 436V459.5' stroke='currentColor' strokeWidth='1.5' />,
  ),
  glyph(
    '183.25 427.75 40 40',
    <path
      d='M194.5 445.25V443.25C194.5 439.936 197.186 437.25 200.5 437.25H204.5C207.814 437.25 210.5 439.936 210.5 443.25V444.63C210.5 445.641 209.991 446.584 209.146 447.139L194.5 456.75V458.25H212'
      stroke='currentColor'
      strokeWidth='1.5'
    />,
  ),
  glyph(
    '222.5 427.75 40 40',
    <path
      d='M234 443.396V442.25C234 439.489 236.239 437.25 239 437.25H245.878C248.707 437.25 251 439.543 251 442.372C251 445.201 248.707 447.494 245.878 447.494H237.909V447.75H245.75C248.649 447.75 251 450.101 251 453C251 455.899 248.649 458.25 245.75 458.25H239C236.239 458.25 234 456.011 234 453.25V451.591'
      stroke='currentColor'
      strokeWidth='1.5'
    />,
  ),
  glyph(
    '262.25 427.75 40 40',
    <path
      d='M287.5 459V451M287.5 451V436.5H285.5L273 449V451H287.5ZM287.5 451H291.5'
      stroke='currentColor'
      strokeWidth='1.5'
    />,
  ),
  glyph(
    '302.15 427.75 40 40',
    <path
      d='M330.849 437.251H314.849V452.751C314.849 450.251 316.449 445.751 322.849 445.751H324.101C327.552 445.751 330.349 448.549 330.349 452.001C330.349 455.453 327.807 458.249 324.355 458.249H313.5'
      stroke='currentColor'
      strokeWidth='1.5'
    />,
  ),
  glyph(
    '341.05 427.75 40 40',
    <path
      d='M369.349 443.75V442.25C369.349 439.489 367.111 437.25 364.349 437.25H357.849C355.088 437.25 352.849 439.489 352.849 442.25V452.75M352.849 452.75V453.25C352.849 456.011 355.088 458.25 357.849 458.25H364.349C367.111 458.25 369.349 456.011 369.349 453.25C369.349 450.489 367.111 448.25 364.349 448.25H357.349C354.864 448.25 352.849 450.265 352.849 452.75Z'
      stroke='currentColor'
      strokeWidth='1.5'
    />,
  ),
  glyph(
    '380.05 427.75 40 40',
    <path
      d='M391.349 436.5L408.849 436.5V438L394.849 457V459'
      stroke='currentColor'
      strokeWidth='1.5'
    />,
  ),
  glyph(
    '418.8 427.75 40 40',
    <path
      d='M441.349 447.75H436.349M441.349 447.75C444.387 447.75 446.849 445.288 446.849 442.25C446.849 439.212 444.387 436.75 441.349 436.75H436.349C433.312 436.75 430.849 439.212 430.849 442.25C430.849 445.288 433.312 447.75 436.349 447.75M441.349 447.75C444.387 447.75 446.849 450.212 446.849 453.25C446.849 456.288 444.387 458.75 441.349 458.75H436.349C433.312 458.75 430.849 456.288 430.849 453.25C430.849 450.212 433.312 447.75 436.349 447.75'
      stroke='currentColor'
      strokeWidth='1.5'
    />,
  ),
  glyph(
    '456.8 427.75 40 40',
    <path
      d='M471.849 459V457L482.349 446.611M482.349 446.611C483.855 445.629 484.849 443.931 484.849 442C484.849 438.962 482.387 436.5 479.349 436.5H474.349C471.312 436.5 468.849 438.962 468.849 442C468.849 445.038 471.312 447.5 474.349 447.5H479.349C480.456 447.5 481.487 447.173 482.349 446.611Z'
      stroke='currentColor'
      strokeWidth='1.5'
    />,
  ),
]

/** Screen mark: a speaker, crossed out. Stroke width comes from the caller. */
export const MuteGlyph = glyph(
  '0 0 40 40',
  <path
    d='M7 16h5l7-6v20l-7-6H7zM25 15l9 10M34 15l-9 10'
    stroke='currentColor'
  />,
)

/** Play-mode marks for the screens' orange readout. */
export const MODE_GLYPHS = {
  forward: ForwardGlyph,
  backward: BackGlyph,
  random: glyph(
    '0 0 40 40',
    <path
      d='M9 14h5l12 12h5M9 26h5l12-12h5M28 11l3 3-3 3M28 23l3 3-3 3'
      stroke='currentColor'
      strokeWidth='1.5'
    />,
  ),
  alternate: glyph(
    '0 0 40 40',
    <path
      d='M10 15h20M25 10l5 5-5 5M30 25H10M15 20l-5 5 5 5'
      stroke='currentColor'
      strokeWidth='1.5'
    />,
  ),
}
