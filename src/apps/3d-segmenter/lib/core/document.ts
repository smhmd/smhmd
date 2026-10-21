import { hslToHex } from 'src/lib/utils'

import { batch, computed, type ReadonlySignal, signal } from './signals'

/**
 * What's segmented, and how: classes, and a label per element (a vertex,
 * for a mesh). Labels are read anywhere but written only through a
 * transaction, which is also what undo is made of.
 */

export type Cls = { id: number; name: string; color: string; hidden: boolean }

/** Okabe–Ito first (color-blind safe), then golden-angle hues. */
const PALETTE = [
  '#e69f00',
  '#56b4e9',
  '#009e73',
  '#cc79a7',
  '#d55e00',
  '#f0e442',
  '#0072b2',
]

export const colorAt = (i: number) =>
  PALETTE[i] ?? hslToHex((i * 137.5) % 360, 0.7, 0.6)

export const CLASSES: Cls[] = ['box', 'can', 'bottle', 'produce'].map(
  (name, id) => ({ id, name, color: colorAt(id), hidden: false }),
)

export const classes = signal(CLASSES)
/** The class new labels go to; -1 for none. */
export const activeId = signal(CLASSES[0].id)
export const activeClass = computed(() =>
  classes.value.find((c) => c.id === activeId.value),
)

/** Adds a class and makes it the active one. */
export function addClass() {
  const list = classes.peek()
  const id = Math.max(-1, ...list.map((c) => c.id)) + 1
  const cls = {
    id,
    name: `class ${id + 1}`,
    color: colorAt(list.length),
    hidden: false,
  }
  batch(() => {
    classes.value = [...list, cls]
    activeId.value = id
  })
  return id
}

/** The class new labels go to, created on demand so labeling never needs a setup step. */
export const targetClass = () =>
  activeClass.peek() ? activeId.peek() : addClass()

/** Labels as anything outside a transaction sees them: readable, and no way to write. */
export type Labels = Omit<
  Readonly<Int32Array>,
  'fill' | 'set' | 'sort' | 'reverse' | 'copyWithin' | 'subarray' | 'buffer'
>

let array = new Int32Array(0)
const rev = signal(0)
const version = signal(0)
/** What a write touched: the elements, or null for all of them. */
type Listener = (elements: ArrayLike<number> | null) => void
const listeners = new Set<Listener>()

export const labels = {
  /** Tracks every write: for what follows a stroke as it's drawn, like colors. */
  get now(): Labels {
    void rev.value
    return array
  },
  /**
   * Tracks writes once they settle: each one, except mid-stroke, where they
   * wait for the stroke to end. For what takes a pass over every element.
   */
  get settled(): Labels {
    void version.value
    return array
  },
  /** Bumps whenever `settled` would. */
  version: version as ReadonlySignal<number>,
  peek: (): Labels => array,
  /** Calls `listener` with what each write touched; returns what stops it. */
  onWrite(listener: Listener) {
    listeners.add(listener)
    return () => void listeners.delete(listener)
  },
}

function wrote(elements: ArrayLike<number> | null, settles: boolean) {
  listeners.forEach((listener) => listener(elements))
  batch(() => {
    rev.value++
    if (settles) version.value++
  })
}

export type Tx = {
  /** The labels as this transaction found them. */
  readonly base: Labels
  /** A stroke: its writes settle once, when it ends. */
  readonly stroke: boolean
  paint(elements: number[], id: number): void
  fill(id: number, start?: number, end?: number): void
  /** Relabels every `from` as `to`. */
  replace(from: number, to: number): void
  /** Back to `base`, to redo a live edit from scratch. */
  restore(): void
}

type Open = Tx & { classes: Cls[] }

/** One step of history: a patch, so undo only ever touches what it changed. */
type Step = {
  indices: Int32Array
  before: Int32Array
  after: Int32Array
  classes: [before: Cls[], after: Cls[]] | null
}

const LIMIT = 50
export const history = signal({ past: [] as Step[], future: [] as Step[] })
export const canUndo = computed(() => history.value.past.length > 0)
export const canRedo = computed(() => history.value.future.length > 0)

let open: Open | null = null
/** The transaction in progress, if any. */
export const pending = signal<Tx | null>(null)

/** Opens the one transaction there can be; commit or abort it to close it. */
export function begin({ stroke = false } = {}): Tx {
  if (open) throw new Error('A transaction is already open')
  const settles = !stroke
  /** Applies `change` (which returns what it wrote, or null for all) while the transaction is open. */
  const write = (change: () => ArrayLike<number> | null) => {
    if (open !== tx) throw new Error('This transaction has ended')
    wrote(change(), settles)
  }
  const tx: Open = {
    base: array.slice(),
    stroke,
    classes: classes.peek(),
    paint: (elements, id) =>
      write(() => {
        for (const v of elements) array[v] = id
        return elements
      }),
    fill: (id, start = 0, end = array.length) =>
      write(() => (array.fill(id, start, end), null)),
    replace: (from, to) =>
      write(() => {
        for (let v = 0; v < array.length; v++)
          if (array[v] === from) array[v] = to
        return null
      }),
    restore: () => write(() => (array.set(tx.base), null)),
  }
  open = tx
  pending.value = tx
  return tx
}

function close() {
  const tx = open!
  open = null
  pending.value = null
  version.value++
  return tx
}

/** Keeps the open transaction as one step of history, if it changed anything. */
export function commit() {
  if (!open) return
  batch(() => {
    const tx = close()
    const changed: number[] = []
    for (let v = 0; v < array.length; v++)
      if (array[v] !== tx.base[v]) changed.push(v)
    const indices = Int32Array.from(changed)
    const now = classes.peek()
    const step: Step = {
      indices,
      before: indices.map((v) => tx.base[v]),
      after: indices.map((v) => array[v]),
      classes: tx.classes === now ? null : [tx.classes, now],
    }
    if (!indices.length && !step.classes) return
    const { past } = history.peek()
    history.value = { past: [...past, step].slice(-LIMIT), future: [] }
  })
}

/** Drops the open transaction as if it never happened. */
export function abort() {
  if (!open) return
  batch(() => {
    const tx = close()
    array.set(tx.base)
    wrote(null, true)
    restoreClasses(tx.classes)
  })
}

/** Runs `edit` in a transaction of its own: one step of history, or none if it throws. */
export function transact(edit: (tx: Tx) => void) {
  const tx = begin()
  try {
    edit(tx)
  } catch (e) {
    abort()
    throw e
  }
  commit()
}

/** Visibility isn't an edit, so going back in history keeps it as it is. */
function restoreClasses(to: Cls[]) {
  const hidden = new Map(classes.peek().map((c) => [c.id, c.hidden]))
  classes.value = to.map((c) =>
    (hidden.get(c.id) ?? c.hidden) === c.hidden
      ? c
      : { ...c, hidden: !c.hidden },
  )
}

function travel(back: boolean) {
  if (open) throw new Error('Commit or abort the open transaction first')
  const { past, future } = history.peek()
  const step = (back ? past : future).at(-1)
  if (!step) return
  const values = back ? step.before : step.after
  step.indices.forEach((v, i) => (array[v] = values[i]))
  batch(() => {
    if (step.classes) restoreClasses(step.classes[back ? 0 : 1])
    history.value = back
      ? { past: past.slice(0, -1), future: [...future, step] }
      : { past: [...past, step], future: future.slice(0, -1) }
    wrote(step.indices, true)
  })
}

export const undo = () => travel(true)
export const redo = () => travel(false)

/** A new document with these labels, and no history. */
export function reset(labels: Int32Array<ArrayBuffer>) {
  batch(() => {
    open = null
    pending.value = null
    array = labels
    history.value = { past: [], future: [] }
    wrote(null, true)
  })
}
