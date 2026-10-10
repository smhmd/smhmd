import { Container } from 'src/components'
import { SAMPLES_PREFETCH } from 'src/lib/samples'
import { generateHead } from 'src/lib/server'

import {
  Button,
  Frame,
  Keyboard,
  Parameter,
  Screen,
  Speaker,
  Volume,
} from './components'
import {
  BackGlyph,
  ClearGlyph,
  DIGITS,
  TombolaGlyph,
  ExportGlyph,
  ForwardGlyph,
  PatternGlyph,
  PlayGlyph,
  RecordGlyph,
  RestGlyph,
  StopGlyph,
  DotsGlyph,
} from './icons'
import {
  api,
  type ParameterId,
  type ScreenId,
  type SoundName,
  store,
} from './lib'
import { AppIcon, metadata } from './metadata'
import styles from './styles.css?url'

export const { meta, links } = generateHead({
  metadata,
  icon: <AppIcon fill='transparent' padding={13} wip={false} />,
  styles,
  links: SAMPLES_PREFETCH,
})

const SOUNDS: SoundName[] = ['piano', 'synth', 'musicbox', 'triangle', 'sine', 'marimba', 'kalimba', 'harp', 'recorder'] // prettier-ignore

/** Sound keys 1–9; the selected one stays latched. */
function SoundKey({ n, className }: { n: number; className?: string }) {
  const sound = SOUNDS[n - 1]
  const active = store.use((s) => s.sound === sound)
  return (
    <Button
      text={sound}
      icon={DIGITS[n - 1]}
      active={active}
      className={className}
      onClick={() => api.setSound(sound)}
    />
  )
}

function ScreenKey({ id, icon }: { id: ScreenId; icon: typeof PlayGlyph }) {
  const active = store.use((s) => s.screen === id)
  return (
    <Button
      text={`${id.toLowerCase()} sequencer`}
      icon={icon}
      active={active}
      onClick={() => api.show(id)}
    />
  )
}

const PARAMETERS: ParameterId[] = ['blue', 'brown', 'gray', 'orange']

export default function App() {
  const playing = store.use((s) => s.playing)
  const recording = store.use((s) => s.recordStart > 0)

  // The deck is an auto-placed grid: source order is layout order.
  return (
    <Container
      id={metadata.id}
      className='bg-linear-to-br relative from-zinc-700 to-zinc-950 text-black'>
      <div className='wp-[noise.png] pointer-events-none absolute inset-0 bg-repeat opacity-30 mix-blend-overlay' />

      <Frame>
        <Speaker />
        <Volume onChange={api.changeVolume} onMute={api.muteVolume} />
        <Screen />
        {PARAMETERS.map((id) => (
          <Parameter
            key={id}
            variant={id}
            onChange={(delta) => api.changeParameter({ id, delta })}
          />
        ))}

        <ScreenKey id='TOMBOLA' icon={TombolaGlyph} />
        <ScreenKey id='ENDLESS' icon={DotsGlyph} />
        <ScreenKey id='PATTERN' icon={PatternGlyph} />

        <Button
          text='back'
          icon={BackGlyph}
          onClick={() => api.control('left')}
        />
        <Button
          text='forward'
          icon={ForwardGlyph}
          onClick={() => api.control('right')}
        />
        <Button
          text='play'
          icon={PlayGlyph}
          active={playing}
          onClick={() => api.control('play')}
        />
        <Button
          text='record'
          icon={RecordGlyph}
          active={recording}
          onClick={api.record}
        />
        <Button text='stop' icon={StopGlyph} onClick={api.stop} />
        <Button text='export take' icon={ExportGlyph} onClick={api.download} />
        <Button
          text='rest'
          icon={RestGlyph}
          onClick={() => api.control('space')}
        />
        <Button
          text='clear'
          icon={ClearGlyph}
          onClick={() => api.control('delete')}
        />

        <SoundKey n={1} />
        <SoundKey n={2} />
        <SoundKey n={3} />
        <Keyboard />
        <SoundKey n={4} className='row-start-9' />
        <SoundKey n={5} className='row-start-9' />
        <SoundKey n={6} className='row-start-9' />
        <SoundKey n={7} />
        <SoundKey n={8} />
        <SoundKey n={9} />
      </Frame>
    </Container>
  )
}
