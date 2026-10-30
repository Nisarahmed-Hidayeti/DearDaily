import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Unit/component tests must never initialize the configured hosted client.
// Auth integration tests inject their own SDK mocks explicitly.
vi.stubEnv('VITE_SUPABASE_URL', '')
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
vi.stubEnv('VITE_ALLOW_SIGNUP', 'false')
vi.stubEnv('VITE_ENABLE_JOURNALS', 'false')

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
}

window.scrollTo = () => {}
vi.stubEnv('VITE_ENABLE_COMMUNITY', 'false')

vi.stubEnv('VITE_ENABLE_RICH_EDITOR', 'false')
