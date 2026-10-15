import { useEffect, useMemo } from 'react'

import {
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
} from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { Material } from 'three'

import { api, CLAY, data, OVERLAY, ui, view, WIRE } from '../lib'

export default function Scene() {
  const mesh = ui.use((s) => s.mesh)
  const textures = ui.use((s) => s.textures)
  const wireframe = ui.use((s) => s.wireframe)
  const grid = ui.use((s) => s.grid)
  const rotate = ui.use((s) => s.rotate)
  const opacity = ui.use((s) => s.opacity)
  const { gl, camera, controls, size } = useThree()

  useEffect(() => {
    Object.assign(view, { gl, camera, controls })
  }, [gl, camera, controls])

  useEffect(() => api.frame(), [mesh, controls])

  // A resized canvas makes the captured view stale, just like orbiting does.
  useEffect(() => api.move(), [size.width, size.height])

  useEffect(() => {
    OVERLAY.opacity = opacity
  }, [opacity])

  // One material slot per part, so hiding a part's geometry group hides it everywhere.
  const groups = useMemo(() => {
    const fill = (m: Material) => data.parts.map(() => m)
    return { clay: fill(CLAY), overlay: fill(OVERLAY), wire: fill(WIRE) }
  }, [mesh])

  const { geometry } = data
  return (
    <>
      {geometry && (
        <>
          <mesh
            ref={(mesh) => void (view.base = mesh)}
            geometry={geometry}
            material={textures ? data.materials : groups.clay}
          />
          <mesh geometry={geometry} material={groups.overlay} renderOrder={1} />
          {wireframe && (
            <mesh geometry={geometry} material={groups.wire} renderOrder={2} />
          )}
          {grid && (
            <Grid
              position-y={geometry.boundingBox!.min.y - 0.002}
              infiniteGrid
              cellSize={0.1}
              sectionSize={0.5}
              cellColor='#4a4a4a'
              sectionColor='#7a7a7a'
              cellThickness={0.8}
              sectionThickness={1.2}
              fadeDistance={12}
            />
          )}
        </>
      )}
      <OrbitControls
        makeDefault
        enableDamping={false}
        autoRotate={rotate}
        minDistance={0.2}
        maxDistance={8}
        onChange={api.move}
      />
      <GizmoHelper
        alignment='bottom-right'
        margin={[52, size.width < 1024 ? 180 : 52]}>
        <GizmoViewport
          axisColors={['#ff3b5c', '#4ade80', '#3b82f6']}
          labelColor='#0b0b0c'
        />
      </GizmoHelper>
    </>
  )
}
