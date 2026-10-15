import {
  Box3,
  Color,
  DoubleSide,
  MathUtils,
  Matrix4,
  type Mesh,
  type PerspectiveCamera,
  ShaderMaterial,
  Sphere,
  SRGBColorSpace,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three'

import type { Part } from './common'
import { data } from './mesh'

const FAR = 16
export const BACKGROUND = '#202020'
/** How far behind the visible surface (in unit-sphere space) a vertex may sit. */
const EPSILON = 0.01

/** Linear view depth packed into 24 bits; alpha marks mesh pixels. */
const DEPTH = new ShaderMaterial({
  side: DoubleSide,
  vertexShader: /* glsl */ `
    varying float vDepth;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.);
      vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    varying float vDepth;
    void main() {
      vec3 enc = fract(clamp(vDepth / ${FAR.toFixed(1)}, 0., .999) * vec3(1., 255., 65025.));
      enc -= enc.yzz * vec3(1. / 255., 1. / 255., 0.);
      gl_FragColor = vec4(enc, 1.);
    }`,
})

type Controls = { target: Vector3; enabled: boolean; update(): void }

export const view = {
  gl: null as WebGLRenderer | null,
  camera: null as PerspectiveCamera | null,
  controls: null as Controls | null,
  /** The textured model, without overlays. */
  base: null as Mesh | null,
  width: 0,
  height: 0,
  depth: new Float32Array(0),
  screen: new Float32Array(0),
  visible: new Uint8Array(0),
  /** The last Smart Tool mask, in screen pixels. */
  mask: new Uint8Array(0) as Uint8Array,
  /** A copy of the last frame sent to the model, for the SAM cam. */
  frame: null as ImageData | null,
  dirty: true,
  /** Held Space: every tool orbits, like Figma's hand tool. */
  space: false,
}

let targets: [WebGLRenderTarget, WebGLRenderTarget] | undefined

/** Renders the current view twice (texture for SAM, depth for visibility) and projects every vertex. */
export function capture() {
  const { gl, camera, base } = view
  if (!gl || !camera || !base || !data.geometry) return

  const w = gl.domElement.clientWidth
  const h = gl.domElement.clientHeight
  targets ??= [new WebGLRenderTarget(1, 1), new WebGLRenderTarget(1, 1)]
  const [rgb, z] = targets
  rgb.texture.colorSpace = SRGBColorSpace
  rgb.setSize(w, h)
  z.setSize(w, h)

  const pixels = new Uint8Array(w * h * 4)
  const packed = new Uint8Array(w * h * 4)
  const material = base.material
  const clear = gl.getClearColor(new Color())
  const alpha = gl.getClearAlpha()
  const autoClear = gl.autoClear
  gl.autoClear = true // GizmoHelper turns it off between frames

  base.material = data.materials
  gl.setClearColor(BACKGROUND, 1)
  gl.setRenderTarget(rgb)
  gl.render(base, camera)
  gl.readRenderTargetPixels(rgb, 0, 0, w, h, pixels)

  // One slot per part, so hidden parts' emptied groups stay out of the depth pass too.
  base.material = data.parts.map(() => DEPTH)
  gl.setClearColor(0, 0)
  gl.setRenderTarget(z)
  gl.render(base, camera)
  gl.readRenderTargetPixels(z, 0, 0, w, h, packed)

  base.material = material
  gl.setRenderTarget(null)
  gl.setClearColor(clear, alpha)
  gl.autoClear = autoClear

  // WebGL rows start at the bottom; flip to image order.
  const image = new Uint8ClampedArray(w * h * 4)
  const depth = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = (h - 1 - y) * w
    image.set(pixels.subarray(row * 4, (row + w) * 4), y * w * 4)
    for (let x = 0; x < w; x++) {
      const i = (row + x) * 4
      depth[y * w + x] = packed[i + 3]
        ? (packed[i] / 255 + packed[i + 1] / 65025 + packed[i + 2] / 16581375) *
          FAR
        : Infinity
    }
  }

  Object.assign(view, {
    width: w,
    height: h,
    depth,
    mask: new Uint8Array(0),
    dirty: false,
  })
  project()
  view.frame = new ImageData(image.slice(), w, h)
  return { data: image, width: w, height: h }
}

function project() {
  const { camera, width: w, height: h, depth } = view
  const position = data.geometry!.getAttribute('position')
  const n = position.count
  const pv = new Matrix4().multiplyMatrices(
    camera!.projectionMatrix,
    camera!.matrixWorldInverse,
  ).elements
  const mv = camera!.matrixWorldInverse.elements
  const screen = new Float32Array(n * 2)
  const visible = new Uint8Array(n)

  // Hidden parts aren't in the depth pass, so they must never count as visible.
  const shown = new Uint8Array(n)
  for (const part of data.parts)
    if (!part.hidden) shown.fill(1, part.start, part.start + part.count)

  for (let v = 0; v < n; v++) {
    if (!shown[v]) continue
    const x = position.getX(v)
    const y = position.getY(v)
    const z = position.getZ(v)
    const cw = pv[3] * x + pv[7] * y + pv[11] * z + pv[15]
    const sx = ((pv[0] * x + pv[4] * y + pv[8] * z + pv[12]) / cw + 1) * 0.5 * w
    const sy = (1 - (pv[1] * x + pv[5] * y + pv[9] * z + pv[13]) / cw) * 0.5 * h
    screen[v * 2] = sx
    screen[v * 2 + 1] = sy
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue
    const d = -(mv[2] * x + mv[6] * y + mv[10] * z + mv[14])
    visible[v] = +(d - depth[(sy | 0) * w + (sx | 0)] < EPSILON)
  }

  Object.assign(view, { screen, visible })
}

const at = (x: number, y: number) => (y | 0) * view.width + (x | 0)
export const onMesh = (x: number, y: number) => view.depth[at(x, y)] < Infinity
export const inMask = (x: number, y: number) => view.mask[at(x, y)] > 0

/** Visible vertices for which `test(x, y)` holds. */
export function pick(test: (x: number, y: number) => boolean) {
  const { screen, visible } = view
  const out: number[] = []
  for (let v = 0; v < visible.length; v++)
    if (visible[v] && test(screen[v * 2], screen[v * 2 + 1])) out.push(v)
  return out
}

/** Points the camera at a part (or the whole model), keeping the viewing angle. */
export function frame(part?: Part) {
  const { camera, controls } = view
  const position = data.geometry?.getAttribute('position')
  if (!camera || !controls || !position) return

  const sphere = new Sphere(new Vector3(), 1)
  if (part) {
    const box = new Box3()
    const v = new Vector3()
    for (let i = part.start; i < part.start + part.count; i++)
      box.expandByPoint(v.fromBufferAttribute(position, i))
    box.getBoundingSphere(sphere)
  }

  const direction = camera.position.clone().sub(controls.target).normalize()
  // Fit whichever field of view is narrower, so portrait screens don't crop.
  const vertical = MathUtils.degToRad(camera.fov) / 2
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect)
  const distance = sphere.radius / Math.sin(Math.min(vertical, horizontal))
  controls.target.copy(sphere.center)
  camera.position.copy(sphere.center).addScaledVector(direction, distance * 1.1)
  controls.update()
}
