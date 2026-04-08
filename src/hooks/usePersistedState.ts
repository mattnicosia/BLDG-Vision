import { useState, useCallback } from 'react'

/**
 * Like useState but persists to sessionStorage.
 * Survives navigation between pages within the same browser session.
 */
export function usePersistedState<T extends string>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(`bv:${key}`)
      return (stored as T) ?? defaultValue
    } catch {
      return defaultValue
    }
  })

  const setPersistedState = useCallback(
    (value: T) => {
      setState(value)
      try {
        sessionStorage.setItem(`bv:${key}`, value)
      } catch {}
    },
    [key]
  )

  return [state, setPersistedState]
}
