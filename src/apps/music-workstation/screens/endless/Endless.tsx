import { Hud, Item, Label, ModeMark } from '../../components/Hud'
import {
  COLORS,
  HIGHEST,
  LOWEST,
  MAX_STEPS,
  midi,
  store,
  useTransport,
} from '../../lib'
import { endless, settings } from './sequencer'

const DOT_ON = '#c9c5c2'
const DOT_OFF = '#5c5854' // a skipped step
const DOT_UNUSED = '#3a3734' // past the pattern's end: keeps the grid's shape

/**
 * The gate mask as a fixed-size SVG — a 4×4 grid of dot slots, so the HUD
 * never changes size (or jumps) as patterns change length.
 */
function Gate({ pattern }: { pattern: string }) {
  return (
    // block: its bottom edge, not a text descender, sits on the shared baseline
    <svg className='block size-[0.75em]' viewBox='2 2 26 26' aria-hidden>
      {Array.from({ length: 16 }, (_, i) => (
        <circle
          key={i}
          cx={4 + (i % 4) * 7.33}
          cy={4 + Math.floor(i / 4) * 7.33}
          r={2}
          fill={
            i >= pattern.length
              ? DOT_UNUSED
              : pattern[i] === '1'
                ? DOT_ON
                : DOT_OFF
          }
        />
      ))}
    </svg>
  )
}

// The melody as a contour: one slot per step, height by pitch.
const W = 500
const H = 200
const PAD = 20
const sy = (note: string) =>
  H - PAD - ((midi(note) - LOWEST) / (HIGHEST - LOWEST)) * (H - 2 * PAD)

function Contour({
  sequence,
  head,
}: {
  sequence: (string | null)[]
  head: number
}) {
  // 16 slots until the melody outgrows them, then the full 32.
  const slots = sequence.length > MAX_STEPS / 2 ? MAX_STEPS : MAX_STEPS / 2
  const sx = (i: number) => PAD + ((i + 0.5) * (W - 2 * PAD)) / slots
  // Consecutive notes join into runs; a rest breaks the line.
  const line = sequence
    .map((note, i) =>
      note ? `${sequence[i - 1] ? 'L' : 'M'}${sx(i)} ${sy(note)}` : '',
    )
    .join('')

  return (
    <svg
      className='absolute inset-0 size-full will-change-transform'
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden>
      {/* capacity: a tick per slot, lit as the take fills up */}
      {Array.from({ length: slots }, (_, i) => (
        <circle
          key={i}
          cx={sx(i)}
          cy={H - 4}
          r={1.2}
          fill={i < sequence.length ? DOT_ON : DOT_OFF}
        />
      ))}
      <path d={line} fill='none' stroke={COLORS.gray} strokeOpacity={0.5} />
      {sequence.map((note, i) =>
        note ? (
          <circle
            key={i}
            cx={sx(i)}
            cy={sy(note)}
            r={i === head ? 6 : 3.5}
            fill={i === head ? COLORS.orange : '#e8e6e3'}
          />
        ) : (
          <circle
            key={i}
            cx={sx(i)}
            cy={H - PAD}
            r={2.5}
            fill='none'
            stroke={COLORS.gray}
          />
        ),
      )}
    </svg>
  )
}

export default function Endless() {
  const context = store.use()
  const { division, swing, pattern, mode } = settings(context)
  const { sequence, playing } = context
  const head = useTransport(endless, playing)

  return (
    <>
      <Hud>
        <Item color={COLORS.blue} label='div'>
          1/{division}
        </Item>
        <Item color={COLORS.brown} label='swing'>
          {swing.label}
        </Item>
        <Item color={COLORS.gray} label='gate'>
          <Gate pattern={pattern} />
        </Item>
        <ModeMark mode={mode} />
      </Hud>

      <div className='relative flex-1'>
        <Contour sequence={sequence} head={playing ? head : -1} />
        {sequence.length ? null : (
          <div className='absolute inset-0 grid place-items-center'>
            <Label>play keys to write a melody</Label>
          </div>
        )}
      </div>
    </>
  )
}
