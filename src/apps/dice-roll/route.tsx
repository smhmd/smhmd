import { Container } from 'src/components'
import { generateHead } from 'src/lib/server'

import { Background, Controls, Stage } from './components'
import { DICE_FONT_NAME } from './lib'
import { AppIcon, metadata } from './metadata'

export const { meta, links } = generateHead({
  metadata,
  icon: <AppIcon transparent padding={14} />,
  font: `${DICE_FONT_NAME}:wght@700`, // &text=D0123456789.
})

export default function App() {
  return (
    <Container id={metadata.id} className='relative bg-[crimson]'>
      <Background />
      <Stage />
      <Controls />
    </Container>
  )
}
