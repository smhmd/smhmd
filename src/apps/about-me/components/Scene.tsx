import { useEffect, useRef } from 'react'

import { useFrame } from '@react-three/fiber'
import { type Group, Vector3 } from 'three'

import { isMobile } from 'src/lib/env'

import { ROOT_POSITION, ROOT_SCALE } from '../lib/common'
import { OPENER } from '../lib/dialogue'
import { useFraming } from '../lib/framing'
import { panel, store } from '../lib/store'
import { voice } from '../lib/voice'
import { Avatar } from './Avatar'
import { Hitbox, Interact } from './Interact'
import { Set } from './Set'

const world = new Vector3()

/**
 * Projects the avatar's shoulder to screen coordinates so the DOM panel holds
 * its place through the dolly and the lean. Written straight to the element:
 * this runs at frame rate. Mobile docks the rows to the bottom instead.
 */
function Anchor() {
  const { panel: shoulder } = useFraming()
  const group = useRef<Group>(null)

  useFrame(({ camera, size }) => {
    if (!group.current || !panel.current) return

    group.current.getWorldPosition(world).project(camera)
    const x = ((world.x + 1) / 2) * size.width
    const y = ((1 - world.y) / 2) * size.height
    // So PANEL_OFFSET names the middle. Not a Tailwind class — v4 compiles
    // `-translate-x-1/2` to this same property.
    panel.current.style.translate = `calc(${x}px - 50%) calc(${y}px - 50%)`
  })

  return <group ref={group} position={shoulder} />
}

export default function Scene() {
  const node = store.use('node')
  const { avatar } = useFraming()

  useEffect(() => {
    void voice.load() // warm the sheet while the splash is still up
    return voice.stop
  }, [])

  return (
    <group scale={ROOT_SCALE} position={ROOT_POSITION}>
      <Interact />
      <Avatar />

      {/* "Press Simo to talk": his body is the target until there is a
          node at all. Clicked or tapped — one hitbox, one behaviour. */}
      {!node && (
        <Hitbox goto={OPENER} position={[avatar[0], 1.2, avatar[2]]}>
          <cylinderGeometry args={[0.55, 0.55, 2.4, 8]} />
        </Hitbox>
      )}

      {!isMobile && <Anchor />}
      <Set />
    </group>
  )
}
