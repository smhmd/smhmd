import { useEffect, useLayoutEffect } from 'react'

import {
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
} from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import {
  api,
  CLAY,
  data,
  doc,
  GHOST,
  outline,
  OUTLINE,
  OVERLAY,
  PREVIEW,
  ui,
  view,
  WIRE,
} from '../lib'

export default function Scene() {
  const mesh = ui.use((s) => s.mesh)
  const textures = ui.use((s) => s.textures)
  const wireframe = ui.use((s) => s.wireframe)
  const grid = ui.use((s) => s.grid)
  const rotate = ui.use((s) => s.rotate)
  const { gl, camera, controls, size, invalidate } = useThree()

  useEffect(() => {
    Object.assign(view, { gl, camera, controls, invalidate })
  }, [gl, camera, controls, invalidate])

  useEffect(() => api.fit(), [mesh, controls])

  // A resized canvas makes the captured view stale, just like orbiting does.
  useEffect(() => {
    OUTLINE.uniforms.viewport.value.set(size.width, size.height)
    api.move()
  }, [size.width, size.height])

  // Read after `mesh` changes, which re-renders this.
  const { geometry, ghost, materials } = data
  return (
    <>
      {geometry && (
        <>
          <mesh
            ref={(mesh) => void (view.base = mesh)}
            geometry={geometry}
            material={textures ? materials : CLAY}
          />
          <mesh geometry={geometry} material={OVERLAY} renderOrder={1} />
          {wireframe && (
            <mesh geometry={geometry} material={WIRE} renderOrder={2} />
          )}
          <mesh geometry={ghost} material={GHOST} renderOrder={3} />
          <mesh geometry={data.preview} material={PREVIEW} renderOrder={2} />
          <Outline mesh={mesh} />
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

/** The hovered part in the Parts list, or else the selected one. */
function Outline({ mesh }: { mesh: number }) {
  const index = ui.use((s) => (s.hover >= 0 ? s.hover : s.part))
  const hidden = doc.use((s) => s.parts[index]?.hidden ?? true)

  useLayoutEffect(() => {
    outline(hidden ? -1 : index)
    view.invalidate()
  }, [index, hidden, mesh])

  return <mesh geometry={data.outline} material={OUTLINE} renderOrder={4} />
}
