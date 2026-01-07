import { useEffect } from 'react'

interface UseDropdownCloseOptions {
  refs: Array<React.RefObject<HTMLElement>>
  onClose: () => void
  enabled?: boolean
}

export function useDropdownClose({ refs, onClose, enabled = true }: UseDropdownCloseOptions) {
  useEffect(() => {
    if (!enabled) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const clickedInside = refs.some((ref) => ref.current?.contains(target))
      if (!clickedInside) {
        onClose()
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [enabled, onClose, refs])
}
