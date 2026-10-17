import {
  BackSide,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
} from 'three'

import { createTexture } from 'src/lib/graphics'

export const matcap = createTexture((canvas, ctx) => {
  canvas.width = canvas.height = 256
  const g = ctx.createRadialGradient(96, 80, 8, 128, 128, 160)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.55, '#b4afa8')
  g.addColorStop(1, '#2b2927')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
})
matcap.colorSpace = SRGBColorSpace

export const CLAY = new MeshMatcapMaterial({ matcap, color: '#d9d4cc' })

/** Labels draw over the model; unlabeled vertices are fully transparent. */
export const OVERLAY = new MeshBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
})

/** Hidden faces stay faintly visible for context, but never block the view. */
export const GHOST = new MeshBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.2,
  depthWrite: false,
})

/** What a Fill click would take: a tint in the active class's color. */
export const PREVIEW = new MeshBasicMaterial({
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
})

/** Wireframe shading: brighter edges, since there's no surface behind them. */
export const WIRE = new MeshBasicMaterial({
  wireframe: true,
  color: '#ffffff',
  transparent: true,
  opacity: 0.35,
})

/** Wireframe shading's surface: invisible, but it still hides the edges behind it. */
export const HIDDEN = new MeshBasicMaterial({ colorWrite: false })

/**
 * A part's silhouette: its back faces pushed out along their normals by a
 * fixed number of pixels, so only a rim shows around the front faces.
 */
export const OUTLINE = new ShaderMaterial({
  side: BackSide,
  uniforms: {
    width: { value: 2 },
    viewport: { value: new Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    uniform float width;
    uniform vec2 viewport;
    void main() {
      vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      vec2 push = normalize((projectionMatrix * vec4(normalMatrix * normal, 0.)).xy);
      clip.xy += push * width * 2. / viewport * clip.w;
      gl_Position = clip;
    }`,
  fragmentShader: /* glsl */ `
    void main() { gl_FragColor = vec4(1.); }`,
})
