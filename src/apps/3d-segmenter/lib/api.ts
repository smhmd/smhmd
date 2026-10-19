import { clamp } from 'src/lib/math'
import { download } from 'src/lib/utils'

import { FORMATS, type Part, RADIUS, type Shading } from './common'
import { batch, doc } from './core'
import * as editor from './editor'
import { EXPORTS, type ExportFormat } from './export'
import * as mesh from './mesh'
import { sam } from './sam'
import * as session from './session'
import { tool } from './tools'
import { fit } from './view'

const { command, edit } = editor

function show(visible: (index: number) => boolean) {
  mesh.parts.value = mesh.parts
    .peek()
    .map((p, i) =>
      p.hidden === !visible(i) ? p : { ...p, hidden: !visible(i) },
    )
}

const setRadius = command((r: number) => {
  session.radius.value = clamp(RADIUS.min, r, RADIUS.max)
})
/** Scales the size, so each step feels the same small or large. */
const resize = command((factor: number) =>
  setRadius(session.radius.peek() * factor),
)
const setShading = command(
  (shading: Shading) => void (session.shading.value = shading),
)

/** Everything the UI can do. The keys for it are in `app.ts`. */
export const api = {
  /** Loads EdgeTAM, again after it failed. */
  retry: command(() => {
    sam.stop()
    sam.start()
  }),

  open: command(
    async (source: File | string) => {
      const isURL = typeof source === 'string'
      const file = isURL ? source.split('/').pop()! : source.name
      const ext = file.split('.').pop()!.toLowerCase()
      if (!FORMATS.includes(ext))
        return session.notify(
          `Can’t open .${ext} files · try GLB, OBJ, PLY or STL`,
        )
      session.opening.value = file
      try {
        const response = isURL ? await fetch(source) : null
        if (response && !response.ok) throw new Error(response.statusText)
        const buffer = await (response ?? (source as File)).arrayBuffer()
        // Whatever started while it loaded belongs to the old model.
        editor.complete()
        await mesh.parse(file, buffer)
      } catch (e) {
        console.error(e)
        return session.notify(`Couldn’t open ${file}`)
      } finally {
        session.opening.value = ''
      }
      batch(() => {
        session.selectedPart.value = -1
        session.hoveredPart.value = -1
      })
    },
    { interrupts: true },
  ),

  setTool: command((next: editor.Tool) => void (tool.value = next), {
    interrupts: true,
  }),
  setRadius,
  resize,
  grow: command(() => resize(1.25)),
  shrink: command(() => resize(1 / 1.25)),

  toggleXray: command(() => void (session.xray.value = !session.xray.peek()), {
    interrupts: true,
  }),
  toggleGrid: command(() => void (session.grid.value = !session.grid.peek())),
  setShading,
  /** Turns a shading on, or back to Solid if it already is. */
  toggleShading: command((shading: Shading) =>
    setShading(session.shading.peek() === shading ? 'solid' : shading),
  ),

  addClass: command(doc.addClass),
  selectClass: command((id: number) => void (doc.activeId.value = id)),
  /** By position, as the number keys do. */
  selectClassAt: command((index: number) => {
    const cls = doc.classes.peek()[index]
    if (cls) doc.activeId.value = cls.id
  }),

  /** Class edits that don't touch labels. */
  editClass: command(
    (
      id: number,
      patch: Partial<Pick<doc.Cls, 'name' | 'color' | 'hidden'>>,
    ) => {
      doc.classes.value = doc.classes
        .peek()
        .map((c) => (c.id === id ? { ...c, ...patch } : c))
    },
  ),

  /** Keeps the class, drops its labels. */
  clearClass: edit((tx, id: number) => tx.replace(id, -1)),

  removeClass: edit((tx, id: number) => {
    tx.replace(id, -1)
    const classes = doc.classes.peek().filter((c) => c.id !== id)
    doc.classes.value = classes
    doc.activeId.value = classes[0]?.id ?? -1
  }),

  /** Labels a whole part at once; -1 clears it. */
  assignPart: edit((tx, part: Part, id: number) =>
    tx.fill(id, part.start, part.start + part.count),
  ),

  undo: command(doc.undo, { interrupts: true }),
  redo: command(doc.redo, { interrupts: true }),

  fit: command(fit),
  /** Fits the selected part, or the whole model when none is. */
  fitSelection: command(() =>
    fit(mesh.parts.peek()[session.selectedPart.peek()]),
  ),

  selectPart: command((index: number) => {
    const { selectedPart } = session
    selectedPart.value = selectedPart.peek() === index ? -1 : index
  }),
  hoverPart: command(
    (index: number) => void (session.hoveredPart.value = index),
  ),

  /** Hidden parts let you reach whatever they were covering. */
  togglePart: command(
    (index: number) =>
      show((i) => (i === index) === mesh.parts.peek()[i].hidden),
    { interrupts: true },
  ),
  /** Shows only this part, like Blender's local view; again to show everything. */
  soloPart: command(
    (index: number) => {
      const solo = mesh.parts.peek().every((p, i) => p.hidden === (i !== index))
      show((i) => solo || i === index)
    },
    { interrupts: true },
  ),
  showAllParts: command(() => show(() => true), { interrupts: true }),
  hideAllParts: command(() => show(() => false), { interrupts: true }),

  /** Space or Enter: keeps the live selection. */
  complete: command(() => void editor.complete()),

  /** Esc: undoes the live selection as if it never happened, or else deselects the part. */
  cancel: command(
    () => void (editor.cancel() || (session.selectedPart.value = -1)),
  ),

  /** Downloads the model and its labels as one file, in Supervisely's format unless told otherwise. */
  export: command(
    (format: ExportFormat = EXPORTS[0]) => {
      const name = mesh.name.peek()
      if (!name) return
      const base = name.replace(/\.\w+$/, '')
      download(
        format.write(name, doc.classes.peek()),
        `${base}.${format.extension}`,
      )
    },
    { interrupts: true },
  ),
}
