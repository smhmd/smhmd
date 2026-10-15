import { Color } from 'three'

export const APP_ID = '3d-segmenter'
export const MODEL = 'onnx-community/EdgeTAM-ONNX'

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
  /** Index count of the part's geometry group, restored when shown again. */
  faces: number
  hidden: boolean
  /** The class most of its vertices belong to, -1 when unlabeled. */
  cls: number
}
export type Point = { x: number; y: number; positive: boolean }
/** Screen-space corners: x0, y0, x1, y1. */
export type Box = [number, number, number, number]
export type Tool = 'move' | 'smart' | 'brush' | 'erase'
export type Status =
  | 'loading'
  | 'moving'
  | 'encoding'
  | 'ready'
  | 'decoding'
  | 'error'
