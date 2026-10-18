import { useEffect } from 'react'

import { Tooltip } from '@base-ui/react/tooltip'
import clsx from 'clsx'

import { Container } from 'src/components'
import { generateHead } from 'src/lib/server'

import { Drop, Header, Inspector, Sidebar, Stage } from './components'
import { api, SAMPLE, useShortcuts } from './lib'
import { AppIcon, metadata } from './metadata'

export const { meta, links } = generateHead({
  metadata,
  icon: <AppIcon padding={7} transparent />,
  // The sample starts downloading with the page, before any script runs.
  links: [
    { rel: 'preload', href: SAMPLE.url, as: 'fetch', crossOrigin: 'anonymous' },
  ],
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
        )}>
        <Stage />
        <Sidebar />
        <Header />
        <Inspector />
        <Drop />
      </Container>
    </Tooltip.Provider>
  )
}
