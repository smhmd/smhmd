import { useSelector } from '@xstate/react'
import clsx from 'clsx'

import { Bolt, Play, Sparkles } from 'src/icons'
import { Container } from 'src/components'
import { generateHead } from 'src/lib/server'

import { AdvancedOptions, Alert, DropZone, MagnetLink } from './components'
import { actor, api, compareState, createDummyTorrent } from './lib'
import { AppIcon, metadata } from './metadata'
import styles from './styles.css?url'

export const { meta, links } = generateHead({
  metadata,
  icon: <AppIcon transparent padding={24} />,
  styles,
})

export default function App() {
  return (
    <Container
      id={metadata.id}
      className={clsx(
        'flex items-center justify-center px-4',
        'text-white selection:bg-orange-950/40',
        'scrollbar-amber-400',
        'wp-[rainbow-vortex.svg] bg-cover bg-fixed bg-center',
      )}>
      <div className='vmd:gap-8 flex w-full max-w-2xl flex-col gap-4'>
        <header className='flex flex-col gap-4 text-center text-white'>
          <h1
            aria-label='Torrent Magnetizer'
            className='text-4xl font-bold tracking-tight md:text-5xl'>
            Torrent{' '}
            <AppIcon
              aria-hidden
              padding={24}
              transparent
              className='inline size-8 rotate-45 md:size-7'
            />{' '}
            Magnetizer
          </h1>
          <p className='vmd:not-sr-only sr-only block text-lg text-orange-50'>
            <span>
              Transform your torrent files into magnetic energy
              <Bolt aria-hidden className='inline size-4 fill-yellow-400' />
            </span>
          </p>
        </header>

        <Panel />

        <footer className='vlg:not-sr-only sr-only mt-4 text-center text-sm text-orange-50'>
          <p>
            Powered by quantum entanglement and digital magic
            <Sparkles
              aria-hidden
              className='mb-px ml-0.5 inline size-4 fill-yellow-400'
            />
          </p>
        </footer>
      </div>
    </Container>
  )
}

function Panel() {
  const { torrentObject, magnetURI, options, error } = useSelector(
    actor,
    ({ context }) => context,
    compareState,
  )

  return (
    <section
      aria-label='Torrent conversion panel'
      className='flex flex-col items-center justify-center'>
      <div
        className={clsx(
          'flex w-full flex-col gap-y-2',
          'rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl sm:p-8',
        )}>
        {!error ? (
          <DropZone
            torrentObject={torrentObject}
            onUploadFile={api.uploadFile}
            onReset={api.reset}
          />
        ) : (
          <Alert
            severity='error'
            message='The file appears to be corrupted or in an unsupported format. Please try a different torrent file or browser.'
            action={{
              label: 'Try Again',
              handler: api.reset,
            }}
          />
        )}
        {torrentObject && (
          <div className='flex flex-col gap-y-4'>
            <AdvancedOptions
              torrentObject={torrentObject}
              options={options}
              onSelectFiles={api.selectFiles}
              onSetOption={api.setOption}
            />
            {magnetURI && <MagnetLink link={magnetURI} />}
          </div>
        )}
      </div>
      <button
        onClick={() => {
          const torrentFile = createDummyTorrent()
          api.uploadFile(torrentFile)
        }}
        className={clsx(
          'cursor-pointer px-2 py-1 text-xs text-white',
          'opacity-70 transition-opacity hover:opacity-85',
          'outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
          'bg-white/8 rounded-b-lg border border-t-0 border-white/30',
        )}>
        View Demo
        <Play aria-hidden className='mb-0.5 ml-1 inline size-3 fill-current' />
      </button>
    </section>
  )
}
