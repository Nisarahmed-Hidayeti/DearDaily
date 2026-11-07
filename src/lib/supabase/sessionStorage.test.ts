import { beforeEach, expect, it } from 'vitest'
import { persistentAuthStorage as store } from './sessionStorage'
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
it('migrates the old tab session without moving unrelated writing', () => {
  sessionStorage.setItem('sdk-auth', 'synthetic-session')
  sessionStorage.setItem('unrelated', 'private-draft')
  expect(store.getItem('sdk-auth')).toBe('synthetic-session')
  expect(localStorage.getItem('sdk-auth')).toBe('synthetic-session')
  expect(sessionStorage.getItem('sdk-auth')).toBeNull()
  expect(localStorage.getItem('unrelated')).toBeNull()
})
it('survives tab storage clearing and removes both stores on sign-out', () => {
  store.setItem('sdk-auth', 'synthetic-session')
  sessionStorage.clear()
  expect(store.getItem('sdk-auth')).toBe('synthetic-session')
  sessionStorage.setItem('sdk-auth', 'stale-session')
  store.removeItem('sdk-auth')
  expect(store.getItem('sdk-auth')).toBeNull()
})
