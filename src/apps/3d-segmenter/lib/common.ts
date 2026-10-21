export const APP_ID = '3d-segmenter'
export const MODEL = 'onnx-community/EdgeTAM-ONNX'

/** Tailwind's `lg`, in px: panels dock above it and float below. */
export const WIDE = 1024

/** What Open and drop accept: a model, or a Supervisely project. */
export const FORMATS = ['glb', 'gltf', 'obj', 'ply', 'stl', 'tar']

export const SAMPLE = {
  url: '/models/groceries.glb',
  credit: 'YCB Object and Model Set, CC BY 4.0',
}

export type Part = {
  name: string
  /** Vertex range in the merged geometry. */
  start: number
  count: number
  /** Its index count in `data.triangles`, three per triangle. */
  faces: number
  hidden: boolean
}
export type Point = { x: number; y: number; positive: boolean }
/** Screen-space corners: x0, y0, x1, y1. */
export type Box = [number, number, number, number]
/** The ring's radius, in screen pixels. */
export const RADIUS = { min: 4, max: 160 }
/** How the model is drawn, one at a time as in Blender: clay, its own textures, or only its edges. */
export type Shading = 'solid' | 'textures' | 'wireframe'
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
