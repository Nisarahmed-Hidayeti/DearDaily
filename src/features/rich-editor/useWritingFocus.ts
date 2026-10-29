import { useEffect, useState } from 'react'
/** Layout only: never replace the editor, document, selection or save state. */
export function useWritingFocus() {
  const [focus, setFocus] = useState(false)
  useEffect(() => {
    if (!focus) return
    const exit = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing)
        return
      // Dismiss an inner dialog or writing menu first, without exiting focus.
      if (
        document.querySelector(
          'dialog[open], .block-picker, .writer-link, .markdown-import',
        )
      )
        return
      event.preventDefault()
      setFocus(false)
    }
    document.addEventListener('keydown', exit)
    return () => document.removeEventListener('keydown', exit)
  }, [focus])
  return { focus, setFocus }
}
