import { Container } from 'src/components'
import { generateHead } from 'src/lib/server'

import { Splash, Stage } from './components/'
import { AppIcon, metadata } from './metadata'
import styles from './styles.css?url'

export const { meta, links } = generateHead({
  metadata,
  icon: <AppIcon transparent padding={8} />,
  font: 'Josefin+Slab:wght@700',
  styles,
})

export default function App() {
  return (
    <Container
      id={metadata.id}
      className='font-josefin-slab bg-radial-[circle_at_bottom,#18233c_0%,#18233c_30%,#050510_80%]'>
      <Stage />
      <Splash />
    </Container>
  )
}
