import { useMemo, useState } from 'react'

import { GizmoHelper, useGizmoContext } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Vector3 } from 'three'

import { createTexture } from 'src/lib/graphics'
import { HALF_PI, TAU } from 'src/lib/math'

import { gizmoMargin } from '../lib'

type Vec = [number, number, number]
type Axis = { label: string; color: string; direction: Vec; rotation: Vec }

const AXES: Axis[] = [
  { label: 'X', color: '#ff3b5c', direction: [1, 0, 0], rotation: [0, 0, 0] },
  {
    label: 'Y',
    color: '#4ade80',
    direction: [0, 1, 0],
    rotation: [0, 0, HALF_PI],
  },
  {
    label: 'Z',
    color: '#3b82f6',
    direction: [0, 0, 1],
    rotation: [0, -HALF_PI, 0],
  },
]

/**
 * The axis gizmo. drei's GizmoViewport turns the camera the moment a head is
 * pressed; these heads turn it on a tap, so a drag that starts on the gizmo
 * orbits instead, in any tool.
 */
export function Gizmo({ width }: { width: number }) {
  return (
    <GizmoHelper alignment='bottom-right' margin={gizmoMargin(width)}>
      <group scale={40}>
        {AXES.map(({ label, color, direction, rotation }) => (
          <group key={label}>
            <mesh
              rotation={rotation}
              position={direction.map((c) => c * 0.4) as Vec}>
              <boxGeometry args={[0.8, 0.05, 0.05]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            <Head color={color} label={label} direction={direction} />
            <Head color={color} direction={direction.map((c) => -c) as Vec} />
          </group>
        ))}
      </group>
    </GizmoHelper>
  )
}

type HeadProps = { color: string; label?: string; direction: Vec }

/** A disc facing the camera, labeled on the positive end; a tap looks down its axis. */
function Head({ color, label, direction }: HeadProps) {
  const { tweenCamera } = useGizmoContext()
  const [hovered, setHovered] = useState(false)
  const texture = useMemo(
    () =>
      createTexture((canvas, context) => {
        canvas.width = canvas.height = 64
        context.fillStyle = color
        context.arc(32, 32, 16, 0, TAU)
        context.fill()
        if (!label) return
        context.font = '18px Inter var, Arial, sans-serif'
        context.textAlign = 'center'
        context.fillStyle = '#0b0b0c'
        context.fillText(label, 32, 41)
      }),
    [color, label],
  )

  const hover = (on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(on)
  }

  return (
    <sprite
      position={direction}
      scale={(label ? 1 : 0.75) * (hovered ? 1.2 : 1)}
      onPointerOver={hover(true)}
      onPointerOut={hover(false)}
      onClick={(e) => {
        e.stopPropagation()
        tweenCamera(new Vector3(...direction))
      }}>
      <spriteMaterial
        map={texture}
        alphaTest={0.3}
        opacity={label ? 1 : 0.75}
        toneMapped={false}
      />
    </sprite>
  )
}
