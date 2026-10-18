import { Container } from 'src/components'
import { generateHead } from 'src/lib/server'

import { Hud } from './components/Hud'
import { Splash } from './components/Splash'
import { Stage } from './components/Stage'
import { enter } from './lib/store'
import { AppIcon, metadata } from './metadata'
import styles from './styles.css?url'

export const { meta, links } = generateHead({
  metadata,
  icon: <AppIcon transparent padding={8} />,
  styles,
})

/** A loader, not an effect, so it runs before the first paint. */
export function clientLoader() {
  return enter()
}

export default function App() {
  return (
    <Container id={metadata.id}>
      <Stage />
      <Hud />
      <Splash />
    </Container>
  )
}
