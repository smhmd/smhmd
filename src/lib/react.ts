import { createContext, useContext, useSyncExternalStore } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Func = (...args: any[]) => any
type Stable =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Func

export interface Store<T extends object> {
  get(): T
  set(patch: Partial<T> | ((prev: T) => Partial<T>)): void
  use(): T
  /** One field: objects and arrays included, since they keep their identity until set. */
  use<K extends keyof T>(key: K): T[K]
  use<S extends Stable>(selector: (state: T) => S): S
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()
  const subscribe = (notify: () => void) => {
    listeners.add(notify)
    return () => void listeners.delete(notify)
  }

  return {
    get: () => state,

    set(patch) {
      const part = typeof patch === 'function' ? patch(state) : patch
      const changed = Object.keys(part).some(
        (k) => !Object.is(state[k as keyof T], part[k as keyof T]),
      )
      if (!changed) return
      state = { ...state, ...part }
      listeners.forEach((n) => n())
    },

    use(pick?: keyof T | ((state: T) => unknown)) {
      const snapshot =
        pick === undefined
          ? () => state
          : typeof pick === 'function'
            ? () => pick(state)
            : () => state[pick]
      return useSyncExternalStore(subscribe, snapshot, snapshot) as never
    },
  }
}

export function createCtx<T>() {
  const context = createContext<T | undefined>(undefined)

  const useCtx = () => {
    const ctx = useContext(context)

    if (!ctx) throw new Error('useContext must be used within Context.Provider')
    return ctx
  }

  return [context, useCtx] as const
}
