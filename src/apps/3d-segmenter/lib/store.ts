import { createStore } from 'src/lib/react'

import {
  CLASSES,
  type Cls,
  colorAt,
  type Part,
  type Box,
  type Point,
  SAMPLE,
  type Status,
  type Tool,
} from './common'
import {
  colorize,
  count,
  data,
  dominant,
  hide,
  parse,
  toMeta,
  toPLY,
} from './mesh'
import type { Reply, Request } from './sam.worker'
import { capture, frame, inMask, pick, view } from './view'

/** Tools and viewport: every field is a primitive, so components subscribe to exactly what they show. */
export const ui = createStore({
  tool: 'smart' as Tool,
  radius: 24,
  status: 'loading' as Status,
  progress: 0,
  /** A Smart Tool selection is live: further clicks refine it, esc undoes it. */
  selecting: false,
  past: 0,
  future: 0,
  mesh: 0,
  /** Bumps whenever the SAM cam has something new to draw. */
  frame: 0,
  textures: true,
  wireframe: false,
  grid: true,
  rotate: false,
  opacity: 0.8,
})

/** The document: what gets exported. Changes only on discrete edits, never mid-stroke. */
export const doc = createStore({
  name: '',
  classes: CLASSES,
  active: CLASSES[0].id,
  parts: [] as Part[],
})

export const prompts = createStore({
  points: [] as Point[],
  box: null as Box | null,
})

export type Option = 'textures' | 'wireframe' | 'grid' | 'rotate'

type Snapshot = { labels: Int32Array; classes: Cls[] }
const past: Snapshot[] = []
const future: Snapshot[] = []

let worker: Worker | undefined
let ready = false
let viewId = 0
let timer: ReturnType<typeof setTimeout> | undefined

const send = (req: Request, transfer: Transferable[] = []) =>
  worker?.postMessage(req, transfer)

const active = () => doc.get().classes.find((c) => c.id === doc.get().active)

const recolor = () => colorize(doc.get().classes)

function recount() {
  dominant()
  doc.set({ classes: count(doc.get().classes), parts: data.parts })
  recolor()
}

function snapshot() {
  past.push({ labels: data.labels.slice(), classes: doc.get().classes })
  if (past.length > 50) past.shift()
  future.length = 0
  ui.set({ past: past.length, future: 0 })
}

function restore(from: Snapshot[], to: Snapshot[]) {
  const s = from.pop()
  if (!s) return
  api.finish()
  to.push({ labels: data.labels.slice(), classes: doc.get().classes })
  data.labels.set(s.labels)
  doc.set({ classes: s.classes })
  ui.set({ past: past.length, future: future.length })
  recount()
}

/** The class new labels go to, created on demand so painting never needs a setup step. */
function target() {
  if (!active()) api.addClass()
  return doc.get().active
}

function show(visible: (index: number) => boolean) {
  data.parts.forEach((_, i) => hide(i, !visible(i)))
  doc.set({ parts: data.parts })
  api.move()
}

/** Labels before the live selection, so each refining click redoes it from scratch. */
let base: Int32Array | null = null

const bump = () => ui.set({ frame: ui.get().frame + 1 })

function relabel() {
  data.labels.set(base!)
  const id = target()
  for (const v of pick(inMask)) data.labels[v] = id
  recount()
}

function receive(reply: Reply) {
  switch (reply.type) {
    case 'progress':
      return ui.set({ progress: reply.value })
    case 'ready':
      ready = true
      return api.settle()
    case 'encoded':
      if (reply.id === viewId && ui.get().status === 'encoding')
        ui.set({ status: 'ready' })
      return
    case 'mask': {
      if (reply.id !== viewId) return
      view.mask = reply.mask
      if (!base) {
        snapshot()
        base = data.labels.slice()
      }
      relabel()
      bump()
      return ui.set({ status: 'ready', selecting: true })
    }
    case 'error':
      console.error(reply.message)
      return ui.set({ status: 'error' })
  }
}

function download(content: string, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content]))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export const api = {
  start() {
    if (worker) return
    worker = new Worker(new URL('./sam.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = ({ data }: MessageEvent<Reply>) => receive(data)
    send({ type: 'load' })
    void api.open(SAMPLE.url)
  },

  async open(source: File | string) {
    const isURL = typeof source === 'string'
    const name = isURL ? source.split('/').pop()! : source.name
    try {
      const buffer = isURL
        ? await (await fetch(source)).arrayBuffer()
        : await source.arrayBuffer()
      await parse(name, buffer)
    } catch (e) {
      return console.error(e)
    }
    past.length = future.length = 0
    prompts.set({ points: [], box: null })
    ui.set({ mesh: ui.get().mesh + 1, selecting: false, past: 0, future: 0 })
    doc.set({ name, parts: data.parts })
    recount()
    api.move()
  },

  setTool(tool: Tool) {
    api.finish()
    const wasSmart = ui.get().tool === 'smart'
    ui.set({ tool })
    // The model only runs for the Smart Tool, so catch it up on arrival.
    if (tool === 'smart' && !wasSmart) api.settle()
  },

  setRadius(radius: number) {
    ui.set({ radius: Math.min(120, Math.max(4, radius)) })
  },

  toggle(option: Option) {
    ui.set((s) => ({ [option]: !s[option] }))
  },

  setOpacity(opacity: number) {
    ui.set({ opacity })
  },

  addClass() {
    const { classes } = doc.get()
    const id = Math.max(-1, ...classes.map((c) => c.id)) + 1
    const cls = {
      id,
      name: `class ${id + 1}`,
      color: colorAt(classes.length),
      hidden: false,
      count: 0,
    }
    doc.set({ classes: [...classes, cls], active: id })
    recolor()
  },

  /** Picking a class mid-selection relabels it: click an object, then press 3. */
  selectClass(id: number) {
    doc.set({ active: id })
    if (base) relabel()
    else recolor()
  },

  /** Class edits that don't touch labels: name, color, visibility. */
  editClass(
    id: number,
    patch: Partial<Pick<Cls, 'name' | 'color' | 'hidden'>>,
  ) {
    doc.set({
      classes: doc
        .get()
        .classes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
    recolor()
  },

  /** Keeps the class, drops its labels. */
  clearClass(id: number) {
    api.finish()
    snapshot()
    data.labels.forEach((l, v) => l === id && (data.labels[v] = -1))
    recount()
  },

  removeClass(id: number) {
    api.clearClass(id)
    const classes = doc.get().classes.filter((c) => c.id !== id)
    doc.set({ classes, active: classes[0]?.id ?? -1 })
    recount()
  },

  /** Labels a whole part at once; -1 clears it. */
  assignPart(part: Part, id: number) {
    api.finish()
    snapshot()
    data.labels.fill(id, part.start, part.start + part.count)
    recount()
  },

  frame,

  /** Hidden parts let you reach whatever they were covering. */
  togglePart(index: number) {
    show((i) => (i === index) === data.parts[i].hidden)
  },

  /** Shows only this part, like Blender's local view; again to show everything. */
  soloPart(index: number) {
    const solo = data.parts.every((p, i) => p.hidden === (i !== index))
    show((i) => solo || i === index)
  },

  showAllParts: () => show(() => true),
  hideAllParts: () => show(() => false),

  undo: () => restore(past, future),
  redo: () => restore(future, past),

  /** The camera moved: the selection belongs to the old view, so keep it and wait for the camera to settle. */
  move() {
    api.finish()
    view.dirty = true
    clearTimeout(timer)
    timer = setTimeout(api.settle, 250)
    if (ready) ui.set({ status: 'moving' })
  },

  settle() {
    clearTimeout(timer)
    const image = capture()
    if (image) bump()
    // Encoding is the expensive part; skip it unless the Smart Tool needs it.
    if (!image || !ready || ui.get().tool !== 'smart') return
    viewId++
    send({ type: 'encode', id: viewId, ...image }, [image.data.buffer])
    ui.set({ status: 'encoding' })
  },

  /** A click adds a point; Alt-click or a long-press adds one that excludes. */
  tap(x: number, y: number, positive: boolean) {
    const points = [...prompts.get().points, { x, y, positive }]
    api.prompt(points, prompts.get().box)
  },

  /** A dragged box is SAM's strongest prompt, and always starts a new selection. */
  box(box: Box) {
    api.finish()
    api.prompt([], box)
  },

  prompt(points: Point[], box: Box | null) {
    if (!ready) return
    if (view.dirty) api.settle()
    prompts.set({ points, box })
    ui.set({ status: 'decoding' })
    send({ type: 'decode', id: viewId, points, box })
  },

  /** Labels are applied as you click; this just ends the selection. Runs on every orbit frame, so it bails early. */
  finish() {
    const { points, box } = prompts.get()
    if (!base && !points.length && !box) return
    base = null
    view.mask = new Uint8Array(0)
    bump()
    prompts.set({ points: [], box: null })
    ui.set({ selecting: false })
  },

  /** Esc: undo the live selection as if it never happened. */
  cancel() {
    if (base) {
      base = null
      restore(past, [])
    }
    api.finish()
  },

  startStroke(x: number, y: number) {
    api.finish()
    snapshot()
    if (ui.get().tool === 'brush') target()
    api.paint(x, y)
  },

  paint(x: number, y: number) {
    const { tool, radius } = ui.get()
    const id = tool === 'erase' ? -1 : doc.get().active
    const r2 = radius * radius
    for (const v of pick((sx, sy) => (sx - x) ** 2 + (sy - y) ** 2 < r2))
      data.labels[v] = id
    recolor()
  },

  endStroke: recount,

  /** A second finger landed mid-stroke: it was a navigation gesture after all. */
  cancelStroke: () => restore(past, []),

  export() {
    api.finish()
    const { classes, name } = doc.get()
    if (!data.geometry) return
    download(toPLY(classes), name.replace(/\.\w+$/, '') + '.ply')
    download(toMeta(classes), 'meta.json')
  },
}
