import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'

import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { animate, useMotionValue } from 'motion/react'
import {
  AdditiveAnimationBlendMode,
  AnimationUtils,
  FrontSide,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  Quaternion,
  Vector3,
} from 'three'

import { PI } from 'src/lib/math'

import { isAdditive, useAnimate } from '../lib/animate'
import {
  ADDITIVE_ANIMS,
  AVATAR_SCALE,
  GAZE_DEPTH,
  GAZE_EYE,
  GAZE_FOLLOW,
  GAZE_HEAD,
  GAZE_PANEL_DEPTH,
  GAZE_TAU,
} from '../lib/common'
import { useFraming } from '../lib/framing'
import { applyFace, collectFaces } from '../lib/lipsync'
import { cursor, store } from '../lib/store'
import { voice } from '../lib/voice'

const GAZE_IN = { duration: 0.6, ease: 'easeOut' } as const
const GAZE_OUT = { duration: 0.25, ease: 'easeOut' } as const

const MODEL = '/models/avatar.glb'

const pose = new Quaternion() // the animated pose, per bone per frame
const aim = new Vector3() // where he is looking, in world space
const want = new Vector3() // where he should be, before damping

/** Leans rather than aims, so the clip goes on posing the bone. */
function look(bone: Object3D, weight: number) {
  pose.copy(bone.quaternion)
  bone.lookAt(aim)
  bone.quaternion.slerp(pose, 1 - weight)
}

export function Avatar() {
  const root = useRef<Group>(null)
  const node = store.use('node')
  const fresh = store.use('fresh')
  const { avatar, distance, gaze: reach } = useFraming()

  const { scene, animations, materials } = useGLTF(MODEL)

  // An action takes its blend mode from its clip at creation, so this must
  // happen before the mixer sees them. Cloned: useGLTF caches the GLTF.
  const clips = useMemo(
    () =>
      animations.map((clip) => {
        if (!ADDITIVE_ANIMS.includes(clip.name)) return clip
        const delta = clip.clone()
        AnimationUtils.makeClipAdditive(delta)
        delta.blendMode = AdditiveAnimationBlendMode
        return delta
      }),
    [animations],
  )

  const { actions, mixer } = useAnimations(clips, root)
  const faces = useMemo(() => collectFaces(scene), [scene])

  const head = useMemo(() => scene.getObjectByName('Head'), [scene])
  const eyes = useMemo(
    () => [scene.getObjectByName('LeftEye'), scene.getObjectByName('RightEye')],
    [scene],
  )

  // Motion values, so they tick outside React.
  const gaze = useMotionValue(1)
  const blink = useMotionValue(0)
  const busy = useRef(false)
  const depth = useRef(GAZE_DEPTH) // the plane, eased between the two below

  const mats = materials as Record<string, MeshStandardMaterial>

  useLayoutEffect(() => {
    mats.outfit_top.color.set('#888888')
    mats.outfit_bottom.color.set('#434343')
    mats.outfit_shoes.color.set('#87827D')
  }, [mats])

  useLayoutEffect(() => {
    actions.idle?.play() // the base layer, runs forever
    scene.traverse((o) => {
      o.castShadow = o.receiveShadow = true

      // The model is an open shell, and three defaults `shadowSide` to the
      // opposite of `side` — i.e. exactly the faces that were deleted.
      const mesh = o as Mesh
      if (mesh.isMesh)
        for (const material of [mesh.material].flat())
          material.shadowSide = FrontSide
    })
  }, [actions, scene])

  useEffect(
    () =>
      animate(blink, [0, 1, 0], {
        duration: 0.16,
        repeat: Infinity,
        repeatDelay: 3.5,
      }).stop,
    [blink],
  )

  useAnimate(node, fresh, actions, mixer)

  // After useAnimations' own useFrame, so the skeleton is already posed.
  useFrame(({ camera }, delta) => {
    applyFace(faces, voice.playhead(), blink.get(), delta)

    // A gesture poses the head with intent, so the look-at yields to it.
    const gesturing = Object.values(actions).some(
      (a) => a && a !== actions.idle && !isAdditive(a) && a.isRunning(),
    )
    if (gesturing !== busy.current) {
      busy.current = gesturing
      animate(gaze, gesturing ? 0 : 1, gesturing ? GAZE_OUT : GAZE_IN)
    }

    const { speaking } = store.get()
    const x = GAZE_FOLLOW ? cursor.x : 0
    const y = GAZE_FOLLOW ? cursor.y : 0

    // Eased, or crossing the gap between two rows would kink the velocity.
    const to = cursor.onRow ? GAZE_PANEL_DEPTH : GAZE_DEPTH
    depth.current += (to - depth.current) * (1 - Math.exp(-delta / GAZE_TAU))

    if (speaking) want.copy(camera.position)
    else
      want
        // +z is behind the lens.
        .set(x * reach[0], y * reach[1], (depth.current - 1) * distance)
        .applyQuaternion(camera.quaternion)
        .add(camera.position)

    // Damp the target, not the bones.
    aim.lerp(want, 1 - Math.exp(-delta / GAZE_TAU))

    // Head first: lookAt refreshes ancestors, so the eyes get the new neck.
    const w = gaze.get()
    if (head) look(head, GAZE_HEAD * w)
    for (const eye of eyes) if (eye) look(eye, GAZE_EYE * w)
  })

  return (
    <group ref={root} position={avatar} scale={AVATAR_SCALE}>
      <primitive object={scene} dispose={null} rotation-y={PI} />
    </group>
  )
}

useGLTF.preload(MODEL)
