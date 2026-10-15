import { useEffect } from 'react'

import { Tooltip } from '@base-ui/react/tooltip'
import clsx from 'clsx'

import { Container } from 'src/components'
import { generateHead } from 'src/lib/server'

import { Header, Inspector, Sidebar, Stage } from './components'
import { api, useShortcuts } from './lib'
import { AppIcon, metadata } from './metadata'

export const { meta, links } = generateHead({
  metadata,
  icon: <AppIcon fill='transparent' padding={14} wip={false} />,
})

export default function App() {
  useEffect(api.start, [])
  useShortcuts()

  return (
    <Tooltip.Provider delay={400}>
      <Container
        id={metadata.id}
        className={clsx(
          'relative bg-[#171717] text-neutral-200',
          'lg:grid lg:grid-cols-[16rem_minmax(0,1fr)_16rem] lg:grid-rows-[3rem_minmax(0,1fr)]',
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) void api.open(file)
        }}>
        <Stage />
        <Sidebar />
        <Header />
        <Inspector />
      </Container>
    </Tooltip.Provider>
  )
}
