import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import PublicStreakControl from './PublicStreakControl'
import { saveProfile } from './communityApi'
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
const client = { rpc: mocks.rpc }
vi.mock('./publicStreakConfig', () => ({ publicStreaksEnabled: true }))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ client }) }))
beforeEach(() => mocks.rpc.mockReset())
it('shares only after explicit confirmation and backend success', async () => {
  mocks.rpc.mockResolvedValue({ data: 4, error: null })
  render(
    <MemoryRouter>
      <PublicStreakControl saved initial={null} />
    </MemoryRouter>,
  )
  expect(screen.getByText('Writing streak is not shared.')).toBeInTheDocument()
  await userEvent.click(
    screen.getByRole('button', { name: 'Share current streak' }),
  )
  expect(mocks.rpc).not.toHaveBeenCalled()
  await userEvent.click(
    screen.getByRole('button', { name: 'Share streak snapshot' }),
  )
  expect(
    await screen.findByText('Shared snapshot: 4 days.'),
  ).toBeInTheDocument()
  expect(mocks.rpc).toHaveBeenCalledWith('set_public_streak', {
    enabled: true,
    today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  })
})
it('never claims hiding succeeded when the backend rejects it', async () => {
  mocks.rpc.mockResolvedValue({
    data: null,
    error: new Error('synthetic rejection'),
  })
  render(
    <MemoryRouter>
      <PublicStreakControl saved initial={3} />
    </MemoryRouter>,
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Hide writing streak' }),
  )
  expect(
    await screen.findByText(/Your streak choice was not confirmed/),
  ).toBeInTheDocument()
  expect(screen.getByText('Shared snapshot: 3 days.')).toBeInTheDocument()
})
it('does not write a backend-owned streak value during ordinary profile editing', async () => {
  const profile = {
    username: 'synthetic',
    display_name: 'Synthetic',
    bio: '',
    avatar: 'leaf',
    visible: true,
    joined_month: null,
    public_streak: 4,
  }
  const insert = vi.fn().mockResolvedValue({ error: null })
  const rpc = vi.fn().mockResolvedValue({ data: profile, error: null })
  await saveProfile(
    { from: () => ({ insert }), rpc } as unknown as SupabaseClient,
    profile,
    null,
  )
  const { public_streak, ...editable } = profile
  void public_streak
  expect(insert).toHaveBeenCalledWith(editable)
})
