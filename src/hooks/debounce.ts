import { useCallback, useEffect, useRef } from 'react'

export function useDebounced(callback: () => void, delay = 1000) {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debounced = useCallback(
    (override = delay) => {
      if (timeout.current) clearTimeout(timeout.current)

      timeout.current = setTimeout(() => {
        callback()
        timeout.current = null
      }, override)
    },
    [callback, delay],
  )

  useEffect(
    () => () => {
      if (timeout.current) {
        clearTimeout(timeout.current)
      }
    },
    [],
  )

  return debounced
}
