import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Account from './Account'

const mocks = vi.hoisted(() => ({ signOut: vi.fn() }))
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({
    client: null,
    session: {
      user: {
        id: 'synthetic-user',
        email: 'synthetic@example.test',
        created_at: '2026-11-08T00:00:00Z',
        email_confirmed_at: '2026-11-08T00:00:00Z',
      },
    },
    signOut: mocks.signOut,
  }),
}))
vi.mock('../community/communityApi', () => ({ communityEnabled: false }))
vi.mock('../journal/journalApi', () => ({ journalEnabled: true }))
function mount() {
  render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route path="/account" element={<Account />} />
        <Route path="/" element={<h1>Signed out destination</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}
describe('account logout honesty', () => {
  beforeEach(() => mocks.signOut.mockReset())
  it('stays on account and explains when logout fails', async () => {
    mocks.signOut.mockResolvedValue(false)
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sign-out could not be confirmed',
    )
    expect(screen.queryByText('Signed out destination')).not.toBeInTheDocument()
  })
  it('navigates home only after logout is confirmed', async () => {
    mocks.signOut.mockResolvedValue(true)
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(
      await screen.findByRole('heading', { name: 'Signed out destination' }),
    ).toBeInTheDocument()
  })
})
