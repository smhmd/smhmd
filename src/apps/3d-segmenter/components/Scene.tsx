import { useEffect } from 'react'

import { Grid, OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'

import { useGlobals } from 'src/contexts'

import { api, editor, mesh, session, useValue, view } from '../lib'
import { Gizmo } from './Gizmo'

/** Solid is clay; Wireframe hides the surface but keeps it in the depth buffer, so back edges stay hidden. Textures uses the model's own. */
const SURFACE = {
  solid: mesh.CLAY,
  wireframe: mesh.HIDDEN,
  textures: undefined,
}

export default function Scene() {
  const opened = useValue(mesh.opened)
  const shading = useValue(session.shading)
  const grid = useValue(session.grid)
  const { gl, size, invalidate } = useThree()
  const viewport = useGlobals().width
  // The Canvas's camera is a perspective one, and the controls are the
  // OrbitControls below (`makeDefault`); useThree only knows the base types.
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const controls = useThree(
    (s) => s.controls,
  ) as unknown as view.Controls | null

  useEffect(
    () => view.connect({ gl, camera, controls, invalidate }),
    [gl, camera, controls, invalidate],
  )

  useEffect(() => api.fit(), [opened, controls])

  // A resized canvas makes the captured view stale, just like orbiting does.
  useEffect(() => {
    mesh.OUTLINE.uniforms.viewport.value.set(size.width, size.height)
    editor.cameraMoved()
  }, [size.width, size.height])

  // Read after a model opens, which re-renders this.
  const { geometry, xray, materials } = mesh.data
  return (
    <>
      {geometry && (
        <>
          <mesh
            ref={(model) => void (view.three.model = model)}
            geometry={geometry}
            material={SURFACE[shading] ?? materials}
          />
          <mesh geometry={geometry} material={mesh.OVERLAY} renderOrder={1} />
          {shading === 'wireframe' && (
            <mesh geometry={geometry} material={mesh.WIRE} renderOrder={2} />
          )}
          <mesh
            ref={(model) => void (view.three.xray = model)}
            geometry={xray}
            material={mesh.XRAY}
            renderOrder={3}
          />
          <mesh
            geometry={mesh.data.preview}
            material={mesh.PREVIEW}
            renderOrder={2}
          />
          <mesh
            geometry={mesh.data.outline}
            material={mesh.OUTLINE}
            renderOrder={4}
          />
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
        minDistance={0.2}
        maxDistance={8}
        onChange={editor.cameraMoved}
      />
      <Gizmo viewport={viewport} />
    </>
  )
}
