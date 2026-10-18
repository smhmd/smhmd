import { lazy, Suspense, useLayoutEffect, useRef } from 'react'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AgXToneMapping, type PerspectiveCamera, Vector3 } from 'three'

import { isMobile } from 'src/lib/env'

import {
  BASE_FOV,
  CAM_ENTRY_OFFSET,
  CAM_ENTRY_SECONDS,
  CAMERA_POSITION,
  CAMERA_TARGET,
  PEEK_TAU,
  PEEK_X,
  PEEK_Y,
} from '../lib/common'
import { useFraming } from '../lib/framing'
import { cursor, store } from '../lib/store'
import { Lights } from './Lights'
import { Preload } from './Preload'

const World = lazy(() => import('./World'))
const Scene = lazy(() => import('./Scene'))

const want = new Vector3() // where the pointer wants the camera
const offset = new Vector3() // where it has damped to

/** Nothing rotates the camera; the lean is all position. */
function Rig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const { fov } = useFraming()
  const ready = store.use('ready')
  // 0 flies in, 1 is already there. Set by `enter` in the route loader.
  const entry = useRef(store.get().entered ? 1 : 0)

  // The camera belongs to <Canvas>, so this is imperative.
  useLayoutEffect(() => {
    camera.fov = fov
    camera.updateProjectionMatrix()
  }, [camera, fov])

  useFrame((_, delta) => {
    if (ready && entry.current < 1) {
      entry.current = Math.min(1, entry.current + delta / CAM_ENTRY_SECONDS)
      if (entry.current === 1) store.set({ entered: true })
    }

    const away = (1 - entry.current) ** 3 // ease out

    // Negated, so the room slides away from the pointer.
    want
      .set(-cursor.x * PEEK_X, -cursor.y * PEEK_Y, 0)
      .applyQuaternion(camera.quaternion)

    offset.lerp(want, 1 - Math.exp(-delta / PEEK_TAU))

    camera.position.set(
      CAMERA_POSITION[0] + CAM_ENTRY_OFFSET[0] * away + offset.x,
      CAMERA_POSITION[1] + CAM_ENTRY_OFFSET[1] * away + offset.y,
      CAMERA_POSITION[2] + CAM_ENTRY_OFFSET[2] * away + offset.z,
    )
  })

  return null
}

export function Stage() {
  return (
    <Canvas
      className='bg-black'
      // PCF steps; VSM loses contact and unsticks the avatar's feet.
      shadows='soft'
      dpr={[1, isMobile ? 1.5 : 2]}
      gl={{ antialias: true, toneMapping: AgXToneMapping }}
      // Seed only; Rig solves the real FOV from the canvas aspect.
      camera={{ position: CAMERA_POSITION, fov: BASE_FOV }}
      onCreated={({ camera }) => camera.lookAt(...CAMERA_TARGET)}>
      <Suspense fallback={null}>
        <Rig />
        <Lights />
        <World />
        <Scene />
        {/* Last: its layout effect must see a fully populated scene. */}
        <Preload />
      </Suspense>
    </Canvas>
  )
}
