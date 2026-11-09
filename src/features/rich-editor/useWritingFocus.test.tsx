import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { useWritingFocus } from './useWritingFocus'
beforeEach(() => localStorage.removeItem('deardaily.writing-focus'))
it('starts immersive and remembers an intentional full-editor preference', () => {
  const first = renderHook(() => useWritingFocus())
  expect(first.result.current.focus).toBe(true)
  act(() => first.result.current.setFocus(false))
  first.unmount()
  const reopened = renderHook(() => useWritingFocus())
  expect(reopened.result.current.focus).toBe(false)
})
it('Escape dismisses focus only when an inner dialog is not active', () => {
  const { result } = renderHook(() => useWritingFocus())
  const dialog = document.createElement('dialog')
  dialog.setAttribute('open', '')
  document.body.append(dialog)
  act(() =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
  )
  expect(result.current.focus).toBe(true)
  dialog.remove()
  act(() =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
  )
  expect(result.current.focus).toBe(false)
})
