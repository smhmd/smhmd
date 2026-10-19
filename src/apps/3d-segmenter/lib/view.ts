import {
  Box3,
  Color,
  MathUtils,
  MOUSE,
  TOUCH,
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

import { type Part, WIDE } from './common'
import { batch, effect, signal } from './core'
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

export type Controls = {
  target: Vector3
  mouseButtons: { LEFT?: MOUSE | null; RIGHT?: MOUSE | null }
  touches: { ONE?: TOUCH | null; TWO?: TOUCH | null }
  update(): void
}

/** The canvas's three.js objects. */
export const three = {
  gl: null as WebGLRenderer | null,
  camera: null as PerspectiveCamera | null,
  controls: null as Controls | null,
  /** The textured model, without overlays, and the labels X-ray has made see-through. */
  model: null as Mesh | null,
  xray: null as Mesh | null,
  /** The canvas only redraws on demand: `draw` asks for a frame. */
  invalidate: () => {},
}

/** The view as last captured, for picking: what's where on screen, and what's in front. */
export type Capture = {
  width: number
  height: number
  depth: Float32Array
  /** Per vertex: its screen position, x and y. */
  screen: Float32Array
  /** Per vertex: 1 when it's on screen and nothing hides it. */
  seen: Uint8Array
  /** The textured view, for the model and the SAM Cam; null when the tool didn't need it. */
  frame: ImageData | null
}

/** The canvas is up (or remade). */
export const connected = signal(0)
/** The capture no longer matches the camera; picking waits for a new one. */
export const stale = signal(true)
export const captured = signal<Capture | null>(null)

export function connect(
  objects: Pick<typeof three, 'gl' | 'camera' | 'controls' | 'invalidate'>,
) {
  Object.assign(three, objects)
  connected.value++
}

/** An effect that changes what's drawn: the canvas redraws after each run. */
export const draw = (fn: () => void): (() => void) =>
  effect(() => {
    fn()
    three.invalidate()
  })

let targets: [WebGLRenderTarget, WebGLRenderTarget] | undefined

/** What a tool needs from a capture: the textured view (for SAM), or X-ray treated as off (for the eraser). */
export type Needs = { needsImage?: boolean; ignoresXray?: boolean }

/**
 * Renders the view's depth and projects every vertex, as the tool sees it:
 * one that ignores X-ray sees see-through labels as solid; one that needs the
 * image gets the textured view too. Returns whether there was anything to
 * capture yet.
 */
export function capture({ needsImage, ignoresXray }: Needs) {
  const { gl, camera, model, xray } = three
  if (!gl || !camera || !model || !xray || !data.geometry) return false

  const w = gl.domElement.clientWidth
  const h = gl.domElement.clientHeight
  targets ??= [new WebGLRenderTarget(1, 1), new WebGLRenderTarget(1, 1)]
  const [color, z] = targets
  color.texture.colorSpace = SRGBColorSpace
  color.setSize(w, h)
  z.setSize(w, h)

  const pixels = new Uint8Array(w * h * 4)
  const packed = new Uint8Array(w * h * 4)
  const clear = gl.getClearColor(new Color())
  const alpha = gl.getClearAlpha()
  const autoClear = gl.autoClear
  // Cleared once per pass, so the meshes in it stack.
  gl.autoClear = false

  /** Renders `meshes` in `material` over `background` into `target`, and reads it back into `out`. */
  const pass = (
    target: WebGLRenderTarget,
    background: [string | number, number],
    meshes: Mesh[],
    material: Mesh['material'],
    out: Uint8Array,
  ) => {
    gl.setRenderTarget(target)
    // After choosing the target: the clear color is converted for its color space.
    gl.setClearColor(...background)
    gl.clear()
    for (const mesh of meshes) {
      const own = mesh.material
      mesh.material = material
      gl.render(mesh, camera)
      mesh.material = own
    }
    gl.readRenderTargetPixels(target, 0, 0, w, h, out)
  }

  if (needsImage) pass(color, [BACKGROUND, 1], [model], data.materials, pixels)
  pass(z, [0, 0], ignoresXray ? [model, xray] : [model], DEPTH, packed)

  gl.setRenderTarget(null)
  gl.setClearColor(clear, alpha)
  gl.autoClear = autoClear

  // WebGL rows start at the bottom; flip to image order.
  const frame = new Uint8ClampedArray(w * h * 4)
  const depth = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = (h - 1 - y) * w
    frame.set(pixels.subarray(row * 4, (row + w) * 4), y * w * 4)
    for (let x = 0; x < w; x++) {
      const i = (row + x) * 4
      depth[y * w + x] = packed[i + 3]
        ? (packed[i] / 255 + packed[i + 1] / 65025 + packed[i + 2] / 16581375) *
          FAR
        : Infinity
    }
  }

  batch(() => {
    captured.value = {
      width: w,
      height: h,
      depth,
      ...project(ignoresXray ? data.visible : data.solid, w, h, depth),
      frame: needsImage ? new ImageData(frame, w, h) : null,
    }
    stale.value = false
  })
  return true
}

/** Projects every vertex in `mask` to the screen, and marks the ones in front. */
function project(mask: Uint8Array, w: number, h: number, depth: Float32Array) {
  const { camera } = three
  const position = data.geometry!.getAttribute('position')
  const n = position.count
  const pv = new Matrix4().multiplyMatrices(
    camera!.projectionMatrix,
    camera!.matrixWorldInverse,
  ).elements
  const mv = camera!.matrixWorldInverse.elements
  const screen = new Float32Array(n * 2)
  const seen = new Uint8Array(n)

  // What isn't in the depth pass must never count as seen.
  for (let v = 0; v < n; v++) {
    if (!mask[v]) continue
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
    seen[v] = +(d - depth[(sy | 0) * w + (sx | 0)] < EPSILON)
  }

  return { screen, seen }
}

/** Vertices seen in the last capture for which `test(x, y)` holds; tracks `captured`. */
export function pick(test: (x: number, y: number) => boolean) {
  const out: number[] = []
  const { screen, seen } = captured.value ?? {}
  if (!screen || !seen) return out
  for (let v = 0; v < seen.length; v++)
    if (seen[v] && test(screen[v * 2], screen[v * 2 + 1])) out.push(v)
  return out
}

/** World units per screen pixel at a point's depth, so a ring on screen becomes a reach in 3D. */
export function pixel(point: Vector3) {
  const camera = three.camera!
  const depth = -point.clone().applyMatrix4(camera.matrixWorldInverse).z
  const height = captured.peek()?.height ?? 1
  return (2 * depth * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / height
}

/**
 * The drawn triangle under a screen point, front-most, and its vertex nearest
 * the point; null over the background. By triangle rather than by nearby
 * vertex, so a big flat face is under the pointer even far from its corners.
 */
export function under(x: number, y: number) {
  const screen = captured.value?.screen
  const { camera } = three
  if (!screen) return null
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
  const { camera, controls } = three
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
 * bottom-right corner. Phones lift it clear of the toolbar. By the viewport,
 * not the canvas, which is narrower than `WIDE` between docked panels.
 */
export const gizmoMargin = (viewport: number): [number, number] => [
  52,
  viewport < WIDE ? 180 : 52,
]

/** Whether a canvas point is on the gizmo, which takes its own clicks. */
export function onGizmo(x: number, y: number) {
  const canvas = three.gl!.domElement
  const [mx, my] = gizmoMargin(innerWidth)
  const [cx, cy] = [canvas.clientWidth - mx, canvas.clientHeight - my]
  return (x - cx) ** 2 + (y - cy) ** 2 < 48 ** 2
}
