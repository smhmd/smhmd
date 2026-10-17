import { Color } from 'three'

export const APP_ID = '3d-segmenter'
export const MODEL = 'onnx-community/EdgeTAM-ONNX'

/** What Open and drop accept. */
export const FORMATS = ['glb', 'gltf', 'obj', 'ply', 'stl']

export const SAMPLE = {
  url: '/models/groceries.glb',
  credit: 'YCB Object and Model Set, CC BY 4.0',
}

/** Okabe–Ito first (color-blind safe), then golden-angle hues. */
const PALETTE = [
  '#e69f00',
  '#56b4e9',
  '#009e73',
  '#f0e442',
  '#0072b2',
  '#d55e00',
  '#cc79a7',
]
export const colorAt = (i: number) =>
  PALETTE[i] ??
  `#${new Color().setHSL(((i * 137.5) % 360) / 360, 0.7, 0.6).getHexString()}`

export type Cls = {
  id: number
  name: string
  color: string
  hidden: boolean
  count: number
}

export const CLASSES: Cls[] = ['box', 'can', 'bottle', 'produce'].map(
  (name, id) => ({ id, name, color: colorAt(id), hidden: false, count: 0 }),
)

export type Part = {
  name: string
  /** Vertex range in the merged geometry. */
  start: number
  count: number
  /** Its index count in `data.triangles`, three per triangle. */
  faces: number
  hidden: boolean
  /** The class most of its vertices belong to, -1 when unlabeled. */
  cls: number
}
export type Point = { x: number; y: number; positive: boolean }
/** Screen-space corners: x0, y0, x1, y1. */
export type Box = [number, number, number, number]
export type Tool = 'move' | 'smart' | 'fill' | 'brush' | 'erase'
/** How the model is drawn, one at a time as in Blender: clay, its own textures, or only its edges. */
export type Shading = 'solid' | 'textures' | 'wireframe'
export type Status =
  | 'loading'
  | 'moving'
  | 'encoding'
  | 'ready'
  | 'decoding'
  | 'error'

/** A box as CSS, whichever corner it was dragged from. */
export const rect = ([x0, y0, x1, y1]: Box) => ({
  left: `${Math.min(x0, x1)}px`,
  top: `${Math.min(y0, y1)}px`,
  width: `${Math.abs(x1 - x0)}px`,
  height: `${Math.abs(y1 - y0)}px`,
})

export type Release = {
  /** Barely moved: a click or tap rather than a drag. */
  click: boolean
  /** Held still: the touch screen's Alt- or Shift-click. */
  long: boolean
  alt: boolean
  /** Where the drag started, or where Space moved its start to (boxes only). */
  from: readonly [number, number]
}

/**
 * What a tool does with the pointer and the view. The dispatcher in `api`
 * drives the active one, so nothing else needs to know which tool that is.
 * Positions are canvas pixels.
 */
export type Behavior = {
  /** How a left-drag acts: painting along the way, or drawing a box. Without one, it orbits. */
  gesture?: 'stroke' | 'box'
  /** Scroll and [ ] resize its ring. */
  sized?: boolean
  /** Needs the textured view, not only depth: what feeds the model. */
  image?: boolean
  /** Hovering, without buttons; null when the pointer leaves. */
  hover?(point: readonly [number, number] | null): void
  press?(x: number, y: number): void
  drag?(x: number, y: number): void
  release?(x: number, y: number, how: Release): void
  /** The drag was navigation after all (a second finger landed), or the browser took it over. */
  abort?(): void
  /** Ends anything in flight (a live selection, a preview) before the view, the labels or the tool change. */
  flush?(): void
  /** A fresh capture of the view. */
  settled?(): void
  /** The active class changed. */
  reclass?(): void
}
