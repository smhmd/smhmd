import { computed, effect, type ReadonlySignal } from '@preact/signals-core'
import { useMemo, useSyncExternalStore } from 'react'

export {
  batch,
  computed,
  effect,
  type ReadonlySignal,
  type Signal,
  signal,
  untracked,
} from '@preact/signals-core'

type Effect = () => void | (() => void)

/** Effects that start and stop together; returns what stops them all. */
export function effects(...fns: Effect[]) {
  const stops = fns.map((fn) => effect(fn))
  return () => stops.forEach((stop) => stop())
}

/**
 * A component's view of a signal, or of anything read from signals: it
 * re-renders only when that value changes. A function is recomputed when
 * its signals or `deps` change.
 */
export function useValue<T>(source: ReadonlySignal<T>): T
export function useValue<T>(read: () => T, deps?: unknown[]): T
export function useValue<T>(
  source: ReadonlySignal<T> | (() => T),
  deps: unknown[] = [],
): T {
  const value = useMemo(
    () => (typeof source === 'function' ? computed(source) : source),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    typeof source === 'function' ? deps : [source],
  )
  const store = useMemo(
    () => ({
      subscribe: (notify: () => void) =>
        effect(() => {
          void value.value
          notify()
        }),
      get: () => value.peek(),
    }),
    [value],
  )
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
