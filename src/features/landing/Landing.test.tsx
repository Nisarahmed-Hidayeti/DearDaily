import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import Landing from './Landing'
const state = vi.hoisted(() => ({
  session: null as object | null,
  loading: false,
}))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => state }))
function show() {
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  )
}
it('offers registration to guests without implying their writing is saved', () => {
  state.session = null
  state.loading = false
  show()
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
    'href',
    '/auth/sign-in',
  )
  expect(screen.getByRole('link', { name: 'Start writing' })).toHaveAttribute(
    'href',
    '/auth/sign-up',
  )
})
it('shows the account and real journal for a signed-in reader', () => {
  state.session = {}
  state.loading = false
  show()
  expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Your account' })).toHaveAttribute(
    'href',
    '/account',
  )
  expect(
    screen.getByRole('link', { name: 'Continue writing' }),
  ).toHaveAttribute('href', '/app/write')
  expect(screen.queryByText('Try the demo')).toBeNull()
})
it('does not flash signed-out navigation while restoring a session', () => {
  state.session = null
  state.loading = true
  show()
  expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull()
  expect(screen.getByRole('status')).toHaveTextContent('Restoring')
})
