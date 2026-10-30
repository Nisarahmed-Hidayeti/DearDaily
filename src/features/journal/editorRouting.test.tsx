import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import Editor from './Editor'
const flags = vi.hoisted(() => ({
  enabled: false,
  session: null as null | { user: { id: string } },
  loading: false,
}))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => flags }))
vi.mock('../auth/AuthPages', () => ({
  RequireAccount: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('./journalApi', async (original) => ({
  ...(await original<typeof import('./journalApi')>()),
  get journalEnabled() {
    return flags.enabled
  },
}))
vi.mock('./CloudEditor', () => ({ default: () => <h1>Real cloud editor</h1> }))
vi.mock('./DemoEditor', () => ({
  default: () => <h1>Sample writing is not saved</h1>,
}))
beforeEach(() => {
  flags.enabled = false
  flags.loading = false
  flags.session = null
})
const show = () =>
  render(
    <MemoryRouter>
      <Editor />
    </MemoryRouter>,
  )
it('never shows sample writing to an authenticated account when cloud features are disabled', () => {
  flags.session = { user: { id: 'A' } }
  show()
  expect(screen.getByText(/Cloud writing is not available/)).toBeVisible()
  expect(screen.queryByText('Sample writing is not saved')).toBeNull()
})
it('uses only the cloud editor for authenticated writing', () => {
  flags.enabled = true
  flags.session = { user: { id: 'A' } }
  show()
  expect(screen.getByText('Real cloud editor')).toBeVisible()
})
it('does not flash a sample editor while restoring a session', () => {
  flags.loading = true
  show()
  expect(screen.getByText('Restoring your account…')).toBeVisible()
  expect(screen.queryByText('Sample writing is not saved')).toBeNull()
})
it('keeps guests in explicitly unsaved sample mode', () => {
  show()
  expect(screen.getByText('Sample writing is not saved')).toBeVisible()
})
