import { useCallback, useEffect, useState } from 'react'
/** Layout only: never replace the editor, document, selection or save state. */
export function useWritingFocus() {
  const [focus, updateFocus] = useState(() => {
    try {
      return localStorage.getItem('deardaily.writing-focus') !== 'false'
    } catch {
      return true
    }
  })
  const setFocus = useCallback((next: boolean) => {
    updateFocus(next)
    try {
      localStorage.setItem('deardaily.writing-focus', String(next))
    } catch {
      /* Layout remains usable when storage is unavailable. */
    }
  }, [])
  useEffect(() => {
    if (!focus) return
    const exit = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing)
        return
      // Dismiss an inner dialog or writing menu first, without exiting focus.
      if (
        document.querySelector(
          'dialog[open], .block-picker, .block-actions-menu, .writer-link, .markdown-import',
        )
      )
        return
      event.preventDefault()
      setFocus(false)
    }
    document.addEventListener('keydown', exit)
    return () => document.removeEventListener('keydown', exit)
  }, [focus, setFocus])
  return { focus, setFocus }
}
