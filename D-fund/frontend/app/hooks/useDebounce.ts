import { useState, useEffect } from 'react'

/**
 * Delays updating the returned value until the input hasn't changed for `delay` ms.
 * Use as the queryKey instead of the raw input to avoid a request on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
