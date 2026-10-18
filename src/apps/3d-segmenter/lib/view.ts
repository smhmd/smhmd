import {
  Box3,
  Color,
  MathUtils,
  MOUSE,
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

type Controls = {
  target: Vector3
  enabled: boolean
  mouseButtons: { LEFT?: MOUSE | null; RIGHT?: MOUSE | null }
  update(): void
}

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
  /** The last Smart Select mask, in screen pixels. */
  mask: new Uint8Array(0) as Uint8Array,
  /** The last textured frame, for the model and the SAM Cam. */
  frame: null as ImageData | null,
  dirty: true,
  /** Held keys. ⌘ (Ctrl off Apple) turns every tool into the hand, like Figma's Space. */
  hand: false,
  shift: false,
  /** The pointer over the canvas, in canvas pixels; null when it's elsewhere. */
  pointer: null as readonly [number, number] | null,
  /** The canvas only redraws on demand; call after changing anything imperatively. */
  invalidate: () => {},
}

let targets: [WebGLRenderTarget, WebGLRenderTarget] | undefined

/**
 * Renders the view's depth for visibility and projects every vertex. With
 * `rgb`, it also renders the textured view into `view.frame`, for SAM.
 * Returns whether there was anything to capture yet.
 */
export function capture(rgb: boolean) {
  const { gl, camera, base } = view
  if (!gl || !camera || !base || !data.geometry) return false

  const w = gl.domElement.clientWidth
  const h = gl.domElement.clientHeight
  targets ??= [new WebGLRenderTarget(1, 1), new WebGLRenderTarget(1, 1)]
  const [color, z] = targets
  color.texture.colorSpace = SRGBColorSpace
  color.setSize(w, h)
  z.setSize(w, h)

  const pixels = new Uint8Array(w * h * 4)
  const packed = new Uint8Array(w * h * 4)
  const material = base.material
  const clear = gl.getClearColor(new Color())
  const alpha = gl.getClearAlpha()
  const autoClear = gl.autoClear
  gl.autoClear = true // GizmoHelper turns it off between frames

  if (rgb) {
    base.material = data.materials
    gl.setClearColor(BACKGROUND, 1)
    gl.setRenderTarget(color)
    gl.render(base, camera)
    gl.readRenderTargetPixels(color, 0, 0, w, h, pixels)
  }

  base.material = DEPTH
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
  if (rgb) view.frame = new ImageData(image, w, h)
  return true
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
  // What's hidden isn't in the depth pass, so it must never count as visible.
  const { shown } = data

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
export const inMask = (x: number, y: number) => view.mask[at(x, y)] > 0

/** Visible vertices for which `test(x, y)` holds. */
export function pick(test: (x: number, y: number) => boolean) {
  const { screen, visible } = view
  const out: number[] = []
  for (let v = 0; v < visible.length; v++)
    if (visible[v] && test(screen[v * 2], screen[v * 2 + 1])) out.push(v)
  return out
}

/** World units per screen pixel at a point's depth, so a ring on screen becomes a reach in 3D. */
export function pixel(point: Vector3) {
  const camera = view.camera!
  const depth = -point.clone().applyMatrix4(camera.matrixWorldInverse).z
  return (
    (2 * depth * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / view.height
  )
}

/**
 * The drawn triangle under a screen point, front-most, and its vertex nearest
 * the point; null over the background. By triangle rather than by nearby
 * vertex, so a big flat face is under the pointer even far from its corners.
 */
export function under(x: number, y: number) {
  const { screen, camera } = view
  const geometry = data.geometry!
  const index = geometry.index!.array
  const p = geometry.getAttribute('position').array
  const m = camera!.matrixWorldInverse.elements
  const depth = (v: number) =>
    -(m[2] * p[v * 3] + m[6] * p[v * 3 + 1] + m[10] * p[v * 3 + 2] + m[14])
  let hit: { face: [number, number, number]; seed: number } | null = null
  let front = Infinity
  for (let t = 0; t < geometry.drawRange.count; t += 3) {
    const a = index[t]
    const b = index[t + 1]
    const c = index[t + 2]
    const ax = screen[a * 2]
    const bx = screen[b * 2]
    const cx = screen[c * 2]
    if ((x < ax && x < bx && x < cx) || (x > ax && x > bx && x > cx)) continue
    const ay = screen[a * 2 + 1]
    const by = screen[b * 2 + 1]
    const cy = screen[c * 2 + 1]
    if ((y < ay && y < by && y < cy) || (y > ay && y > by && y > cy)) continue
    // Barycentric weights: all positive inside the triangle.
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d
    const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d
    const w = 1 - u - v
    if (!(u >= 0 && v >= 0 && w >= 0)) continue
    const [da, db, dc] = [depth(a), depth(b), depth(c)]
    const z = u * da + v * db + w * dc
    if (da <= 0 || db <= 0 || dc <= 0 || z >= front) continue
    front = z
    const seed = u >= v && u >= w ? a : v >= w ? b : c
    hit = { face: [a, b, c], seed }
  }
  return hit
}

/** Points the camera at a part (or the whole model), keeping the viewing angle. */
export function fit(part?: Part) {
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

/**
 * Where the axis gizmo sits: its center's distance from the canvas's
 * bottom-right corner. Phones lift it clear of the toolbar.
 */
export const gizmoMargin = (width: number): [number, number] => [
  52,
  width < 1024 ? 180 : 52,
]

/** Whether a canvas point is on the gizmo, which takes its own clicks. */
export function onGizmo(x: number, y: number) {
  const canvas = view.gl?.domElement
  if (!canvas) return false
  const [mx, my] = gizmoMargin(canvas.clientWidth)
  const [cx, cy] = [canvas.clientWidth - mx, canvas.clientHeight - my]
  return (x - cx) ** 2 + (y - cy) ** 2 < 48 ** 2
}
