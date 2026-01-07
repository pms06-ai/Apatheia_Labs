import { useState } from 'react'

export function useMultiSelect<T extends string>(initialSelected: T[] = []) {
  const [selected, setSelected] = useState<T[]>(initialSelected)

  const toggle = (value: T) => {
    setSelected((prev) => (prev.includes(value) ? prev.filter((id) => id !== value) : [...prev, value]))
  }

  const clear = () => setSelected([])

  const selectAll = (values: T[]) => setSelected(values)

  return {
    selected,
    setSelected,
    toggle,
    clear,
    selectAll,
  }
}
