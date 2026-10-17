import { lazy, Suspense } from 'react'

import { Canvas } from '@react-three/fiber'
import clsx from 'clsx'

import { useGestures } from '../lib'
import { Cursor } from './Cursor'
import { BOX, Prompts } from './Prompts'
import { Rail } from './Rail'
import { Status } from './Status'
import { View } from './View'

const Scene = lazy(() => import('./Scene'))

/** The canvas and everything floating over it. Never re-renders: gestures read state at event time. */
export function Stage() {
  const { stage, ring, draft, handlers } = useGestures()

  return (
    <div
      ref={stage}
      className='in-data-hand:cursor-grab! absolute inset-0 overflow-hidden lg:relative lg:col-start-2 lg:row-start-2 lg:mb-2 lg:rounded-xl lg:bg-[#202020]'
      {...handlers}>
      {/* Redraws only when something changes, so an idle view costs no GPU time. */}
      <Canvas
        frameloop='demand'
        dpr={[1, 2]}
        camera={{ fov: 35, position: [1.6, 1.4, 2.6], near: 0.05, far: 20 }}
        gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Prompts />
      <div ref={draft} hidden className={clsx(BOX, 'border-white')} />
      <Cursor stage={stage} ring={ring} />
      <Status />
      <Rail />
      <View />
    </div>
  )
}
