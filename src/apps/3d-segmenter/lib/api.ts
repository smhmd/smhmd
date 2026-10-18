import { MOUSE, TOUCH } from 'three'

import { clamp } from 'src/lib/math'

import {
  type Cls,
  FORMATS,
  type Part,
  type Release,
  SAMPLE,
  type Shading,
  type Tool,
} from './common'
import * as edit from './edit'
import { EXPORTS, type ExportFormat } from './export'
import { data, parse } from './mesh'
import { sam } from './sam'
import { doc, notify, type Option, ui } from './state'
import { tools } from './tools'
import * as selection from './tools/smart'
import { capture, fit, view } from './view'

const current = () => tools[ui.get().tool]

/** A drag is underway: hovering waits until it ends. */
let pressed = false

/** Redoes the hover after anything changes under a still pointer. The hand orbits, so nothing's under it. */
function rehover() {
  if (view.pointer && !pressed)
    current().hover?.(view.hand ? null : view.pointer)
}

/**
 * How the orbit controls read input. They see every pointer, so a second
 * finger makes a clean two-finger orbit and pinch, but while a tool owns the
 * pointer they leave its left button and single finger alone. With the hand
 * held, left orbits and right pans, as in Move: the controls would pan on a
 * ⌘- or Ctrl-drag otherwise.
 */
function navigation() {
  const controls = view.controls
  if (!controls) return
  Object.assign(controls.mouseButtons, {
    LEFT: pressed ? null : view.hand ? MOUSE.PAN : MOUSE.ROTATE,
    RIGHT: view.hand ? MOUSE.ROTATE : MOUSE.PAN,
  })
  Object.assign(controls.touches, {
    ONE: pressed ? null : TOUCH.ROTATE,
    // A tool takes one finger, so two orbit and pinch; in Move, two pan and pinch.
    TWO: current().gesture ? TOUCH.DOLLY_ROTATE : TOUCH.DOLLY_PAN,
  })
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Before anything picks: the capture must match the camera. */
function fresh() {
  if (view.dirty) api.settle()
}

/**
 * After labels change. With X-ray, finished labels leave what's drawn, so the
 * capture is stale: retake it now rather than when the camera next moves, or
 * picking would wait for an orbit.
 */
function edited() {
  if (view.dirty) api.settle()
  else rehover()
}

/** A discrete label edit: one undo step, then everything derived from labels catches up. */
function change(labels: () => void) {
  current().flush?.()
  edit.snapshot()
  labels()
  edit.recount()
  edited()
}

function history(step: () => void) {
  current().flush?.()
  step()
  edited()
}

function show(visible: (index: number) => boolean) {
  data.parts = data.parts.map((p, i) =>
    p.hidden === !visible(i) ? p : { ...p, hidden: !visible(i) },
  )
  doc.set({ parts: data.parts })
  edit.sync()
  api.move()
}

function download(file: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = name
  a.click()
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(a.href))
}

/** Everything the UI can do; the only place outside a tool where state changes. */
export const api = {
  /** The canvas is up (or remade): picking and navigation can start. */
  connect(
    three: Pick<typeof view, 'gl' | 'camera' | 'controls' | 'invalidate'>,
  ) {
    Object.assign(view, three)
    navigation()
  },

  /** Loads the model and the sample; returns a cleanup that frees the model. */
  start() {
    api.retry()
    void api.open(SAMPLE.url)
    return sam.stop
  },

  /** Loads EdgeTAM, again after it failed. */
  retry() {
    sam.stop()
    sam.start({ ready: () => api.settle(), mask: selection.mask })
  },

  async open(source: File | string) {
    const isURL = typeof source === 'string'
    const name = isURL ? source.split('/').pop()! : source.name
    const ext = name.split('.').pop()!.toLowerCase()
    if (!FORMATS.includes(ext))
      return notify(`Can’t open .${ext} files · try GLB, OBJ, PLY or STL`)
    ui.set({ opening: name })
    try {
      const response = isURL ? await fetch(source) : null
      if (response && !response.ok) throw new Error(response.statusText)
      const buffer = await (response ?? (source as File)).arrayBuffer()
      current().flush?.()
      await parse(name, buffer)
    } catch (e) {
      console.error(e)
      return notify(`Couldn’t open ${name}`)
    } finally {
      ui.set({ opening: '' })
    }
    edit.forget()
    ui.set({ mesh: ui.get().mesh + 1, part: -1, hover: -1 })
    doc.set({ name, parts: data.parts })
    edit.recount()
    api.move()
  },

  setTool(tool: Tool) {
    const before = current()
    before.flush?.()
    ui.set({ tool })
    navigation()
    // The capture is shaped by what the tool sees: catch it up when that
    // changes (the model's image for Smart Select, ghosts for the eraser).
    const after = current()
    if ((after.image && !before.image) || !after.ghosts !== !before.ghosts)
      api.settle()
    else rehover()
  },

  setRadius(radius: number) {
    ui.set({ radius: clamp(4, radius, 160) })
    rehover()
  },

  /** Scales the size, so each step feels the same small or large. */
  resize(factor: number) {
    api.setRadius(ui.get().radius * factor)
  },

  toggle(option: Option) {
    ui.set((s) => ({ [option]: !s[option] }))
    if (option !== 'xray') return
    current().flush?.()
    edit.sync()
    api.move()
  },

  setShading(shading: Shading) {
    ui.set({ shading })
  },

  addClass: edit.addClass,

  selectClass(id: number) {
    doc.set({ active: id })
    current().reclass?.()
    rehover()
  },

  /** Class edits that don't touch labels. */
  editClass(
    id: number,
    patch: Partial<Pick<Cls, 'name' | 'color' | 'hidden'>>,
  ) {
    doc.set({
      classes: doc
        .get()
        .classes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
    edit.recolor()
  },

  /** Keeps the class, drops its labels. */
  clearClass(id: number) {
    change(() =>
      data.labels.forEach((l, v) => l === id && (data.labels[v] = -1)),
    )
  },

  removeClass(id: number) {
    change(() => {
      data.labels.forEach((l, v) => l === id && (data.labels[v] = -1))
      const classes = doc.get().classes.filter((c) => c.id !== id)
      doc.set({ classes, active: classes[0]?.id ?? -1 })
    })
  },

  /** Labels a whole part at once; -1 clears it. */
  assignPart(part: Part, id: number) {
    change(() => data.labels.fill(id, part.start, part.start + part.count))
  },

  undo: () => history(edit.undo),
  redo: () => history(edit.redo),

  fit,

  selectPart(index: number) {
    ui.set((s) => ({ part: s.part === index ? -1 : index }))
  },

  hoverPart(index: number) {
    ui.set({ hover: index })
  },

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

  /** The camera moved: whatever was in flight belongs to the old view, so wait for the camera to settle. */
  move() {
    current().flush?.()
    view.dirty = true
    clearTimeout(timer)
    timer = setTimeout(api.settle, 250)
    sam.moved()
  },

  settle() {
    clearTimeout(timer)
    if (!capture(current())) return
    current().settled?.()
    rehover()
  },

  /** Space or Enter: keeps the live selection. */
  finish() {
    selection.finish()
    edited()
  },

  /** Esc: undoes the live selection as if it never happened, or else deselects the part. */
  cancel() {
    if (!selection.cancel()) ui.set({ part: -1 })
    edited()
  },

  hover(x: number, y: number) {
    view.pointer = [x, y]
    rehover()
  },

  leave() {
    view.pointer = null
    current().hover?.(null)
  },

  /** The hand key or Shift went down or up. */
  held() {
    navigation()
    rehover()
  },

  press(x: number, y: number) {
    pressed = true
    navigation()
    fresh()
    current().press?.(x, y)
  },

  drag(x: number, y: number) {
    current().drag?.(x, y)
  },

  release(x: number, y: number, how: Release) {
    pressed = false
    navigation()
    fresh()
    current().release?.(x, y, how)
    edited()
  },

  abort() {
    pressed = false
    navigation()
    current().abort?.()
    edited()
  },

  /** Downloads the model and its labels as one file, in Supervisely's format unless told otherwise. */
  export(format: ExportFormat = EXPORTS[0]) {
    current().flush?.()
    const { classes, name } = doc.get()
    if (!data.geometry) return
    const base = name.replace(/\.\w+$/, '')
    download(format.write(name, classes), `${base}.${format.extension}`)
  },
}
