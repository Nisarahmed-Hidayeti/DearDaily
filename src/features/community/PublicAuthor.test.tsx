import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { PublicAuthor } from './PublicAuthor'
const state = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('../auth/AuthProvider', () => ({ useAuth: state.auth }))
function client(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: async () => ({ data, error: null }),
  }
  state.auth.mockReturnValue({ client: { from: () => query } })
  return query
}
it('links only a visible public identity using approved profile fields', async () => {
  const q = client({
    username: 'test_writer',
    display_name: 'Quiet observer',
    avatar: 'leaf',
  })
  render(
    <MemoryRouter>
      <PublicAuthor username="test_writer" />
    </MemoryRouter>,
  )
  expect(
    await screen.findByRole('link', { name: 'Quiet observer' }),
  ).toHaveAttribute('href', '/u/test_writer')
  expect(q.select).toHaveBeenCalledWith('username,display_name,avatar')
  expect(q.eq).toHaveBeenCalledWith('visible', true)
})
it('does not link hidden profiles or invent a public identity', async () => {
  client(null)
  render(
    <MemoryRouter>
      <PublicAuthor username="test_writer" />
    </MemoryRouter>,
  )
  expect(screen.getByText('@test_writer')).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})
it('keeps pseudonymous publication independent of profile lookup', () => {
  const q = client(null)
  render(
    <MemoryRouter>
      <PublicAuthor />
    </MemoryRouter>,
  )
  expect(screen.getByText('Anonymous writer')).toBeInTheDocument()
  expect(q.select).not.toHaveBeenCalled()
})
