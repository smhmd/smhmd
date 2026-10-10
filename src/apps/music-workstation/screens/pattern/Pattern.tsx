import { Hud, Item, ModeMark } from '../../components/Hud'
import {
  COLORS,
  HIGHEST,
  LOWEST,
  midi,
  patternWindow,
  STEPS,
  store,
  useTransport,
} from '../../lib'
import { pattern, patternSettings } from './sequencer'

// A dot matrix: 16 steps across, one row per key (chromatic) up. Every
// empty slot is a tiny dot; the active window lights its dots; notes are
// round marks on top. Circles stay round: the viewBox scales uniformly.
const W = 480
const H = 160
const PAD = 16
const ROWS = HIGHEST - LOWEST + 1
const DX = (W - 2 * PAD) / (STEPS - 1)
const DY = (H - 2 * PAD) / (ROWS - 1)
const x = (step: number) => PAD + step * DX
const y = (note: string) => H - PAD - (midi(note) - LOWEST) * DY

const DIM = '#34312e' // slots outside the window
const LIT = '#6f6b66' // slots inside it
const BEAT = '#b3afa9' // the downbeats inside it, every 4 steps
const NOTE_IN = '#f2efe9'
const NOTE_OUT = '#5d5955'

/** Dots as zero-length round-capped strokes, so a whole set is one path. */
const dots = (from: number, to: number, beatsOnly = false) => {
  let d = ''
  for (let c = from; c < to; c++) {
    if (beatsOnly && c % 4) continue
    for (let r = 0; r < ROWS; r++) d += `M${x(c)} ${PAD + r * DY}h0`
  }
  return d
}
const MATRIX = dots(0, STEPS)

function Grid() {
  const context = store.use()
  const { grid, cursor, playing } = context
  const { len, off } = patternWindow(context)
  // Mounted exactly while on-screen, so it owns the transport.
  const head = useTransport(pattern, playing)
  const active = playing ? Math.max(off, head) : cursor
  const accent = playing ? COLORS.orange : COLORS.blue

  return (
    <svg
      className='absolute inset-0 size-full will-change-transform'
      viewBox={`0 0 ${W} ${H}`}
      fill='none'
      strokeLinecap='round'
      aria-hidden>
      <path d={MATRIX} stroke={DIM} strokeWidth={1.5} />
      <path d={dots(off, off + len)} stroke={LIT} strokeWidth={1.5} />
      <path d={dots(off, off + len, true)} stroke={BEAT} strokeWidth={1.5} />
      <path d={dots(active, active + 1)} stroke={accent} strokeWidth={2} />
      {grid.flatMap((column, step) =>
        column.map((note) => (
          <circle
            key={`${step}${note}`}
            cx={x(step)}
            cy={y(note)}
            r={step === active && playing ? 4.5 : 3.5}
            fill={
              step === active && playing
                ? COLORS.orange
                : step >= off && step < off + len
                  ? NOTE_IN
                  : NOTE_OUT
            }
          />
        )),
      )}
    </svg>
  )
}

/** Window + groove + play-mode readouts. */
function Readout() {
  const context = store.use()
  const { len, off, swing, mode } = patternSettings(context)

  return (
    <Hud>
      <Item color={COLORS.blue} label='move'>
        {off}
      </Item>
      <Item color={COLORS.brown} label='swing'>
        {swing.label}
      </Item>
      <Item color={COLORS.gray} label='trim'>
        {len}
      </Item>
      <ModeMark mode={mode} />
    </Hud>
  )
}

export default function Pattern() {
  return (
    <>
      <Readout />
      <div className='relative flex-1'>
        <Grid />
      </div>
    </>
  )
}
