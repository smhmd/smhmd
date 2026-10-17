import { MOUSE } from 'three'

import {
  type Cls,
  type Part,
  type Release,
  SAMPLE,
  type Shading,
  type Tool,
} from './common'
import * as edit from './edit'
import { data, parse, toMeta, toPLY } from './mesh'
import { sam } from './sam'
import { doc, type Option, ui } from './state'
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

let timer: ReturnType<typeof setTimeout> | undefined

/** Before anything picks: the capture must match the camera. */
function fresh() {
  if (view.dirty) api.settle()
}

/** A discrete label edit: one undo step, then everything derived from labels catches up. */
function change(labels: () => void) {
  current().flush?.()
  edit.snapshot()
  labels()
  edit.recount()
  rehover()
}

function history(step: () => void) {
  current().flush?.()
  step()
  rehover()
}

function show(visible: (index: number) => boolean) {
  data.parts = data.parts.map((p, i) =>
    p.hidden === !visible(i) ? p : { ...p, hidden: !visible(i) },
  )
  doc.set({ parts: data.parts })
  edit.sync()
  api.move()
}

function download(content: string, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content]))
  a.download = name
  a.click()
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(a.href))
}

/** Everything the UI can do; the only place outside a tool where state changes. */
export const api = {
  /** Loads the model and the sample; returns a cleanup that frees the model. */
  start() {
    sam.start({ ready: () => api.settle(), mask: selection.mask })
    void api.open(SAMPLE.url)
    return sam.stop
  },

  async open(source: File | string) {
    const isURL = typeof source === 'string'
    const name = isURL ? source.split('/').pop()! : source.name
    try {
      const buffer = isURL
        ? await (await fetch(source)).arrayBuffer()
        : await source.arrayBuffer()
      current().flush?.()
      await parse(name, buffer)
    } catch (e) {
      return console.error(e)
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
    // Only Smart Select feeds the model, so catch it up on arrival.
    if (current().image && !before.image) api.settle()
    else rehover()
  },

  setRadius(radius: number) {
    ui.set({ radius: Math.min(160, Math.max(4, radius)) })
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
    if (!capture(!!current().image)) return
    current().settled?.()
    rehover()
  },

  /** Enter: keeps the live selection. */
  finish: selection.finish,

  /** Esc: undoes the live selection as if it never happened, or else deselects the part. */
  cancel() {
    if (!selection.cancel()) ui.set({ part: -1 })
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
    // Orbit controls pan on a ⌘- or Ctrl-drag and orbit on the right button,
    // so while the hand is held, swap them: left orbits and right pans, as with Move.
    const buttons = view.controls?.mouseButtons
    if (buttons)
      Object.assign(buttons, {
        LEFT: view.hand ? MOUSE.PAN : MOUSE.ROTATE,
        RIGHT: view.hand ? MOUSE.ROTATE : MOUSE.PAN,
      })
    rehover()
  },

  press(x: number, y: number) {
    pressed = true
    fresh()
    current().press?.(x, y)
  },

  drag(x: number, y: number) {
    current().drag?.(x, y)
  },

  release(x: number, y: number, how: Release) {
    pressed = false
    fresh()
    current().release?.(x, y, how)
    rehover()
  },

  abort() {
    pressed = false
    current().abort?.()
    rehover()
  },

  export() {
    current().flush?.()
    const { classes, name } = doc.get()
    if (!data.geometry) return
    download(toPLY(classes), name.replace(/\.\w+$/, '') + '.ply')
    download(toMeta(classes), 'meta.json')
  },
}
