import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import RegistrationSecurityCheck from './RegistrationSecurityCheck'
const mocks = vi.hoisted(() => ({
  source: null as SupabaseClient | null,
  create: vi.fn(),
  checks: vi.fn(),
}))
vi.mock('./AuthProvider', () => ({ useAuth: () => ({ client: mocks.source }) }))
vi.mock('../../lib/supabase/client', () => ({
  authConfig: {
    url: 'https://synthetic.supabase.co',
    key: 'synthetic-public-key',
  },
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.create }))
vi.mock('./hostedJournalChecks', () => ({ hostedJournalChecks: mocks.checks }))
function identity(email: string, id: string, confirmed = true, google = false) {
  const user = {
    id,
    email,
    email_confirmed_at: confirmed ? '2026-11-07T00:00:00Z' : null,
    identities: [{ provider: google ? 'google' : 'email' }],
  }
  mocks.source = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user,
            access_token: 'synthetic-access',
            refresh_token: 'synthetic-refresh',
          },
        },
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  } as unknown as SupabaseClient
  const isolated = {
    auth: {
      setSession: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  }
  mocks.create.mockReturnValue(isolated)
  return isolated
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.source = null
})
async function start() {
  const view = render(<RegistrationSecurityCheck />)
  await userEvent.click(
    screen.getByRole('button', { name: 'Clear test sessions' }),
  )
  return view
}
it('rejects unconfirmed or non-approved identities without retaining a session', async () => {
  identity('nisarahmedhidayeti+deardaily-beta@gmail.com', 'unconfirmed', false)
  await start()
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture current email session' }),
  )
  expect(screen.getByRole('status')).toHaveTextContent('Capture failed')
  expect(mocks.create).not.toHaveBeenCalled()
  expect(
    screen.getByRole('button', { name: 'Run synthetic privacy tests' }),
  ).toBeDisabled()
})
it('requires genuinely different authenticated IDs for the two approved identities', async () => {
  identity('nisarahmedhidayeti+deardaily-beta@gmail.com', 'same-id')
  const view = await start()
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture current email session' }),
  )
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent(
      'Email session verified',
    ),
  )
  identity('deardailywebsite@gmail.com', 'same-id', true, true)
  view.rerender(<RegistrationSecurityCheck />)
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture current google session' }),
  )
  expect(screen.getByRole('status')).toHaveTextContent('Capture failed')
  expect(mocks.create).toHaveBeenCalledTimes(1)
  expect(
    screen.getByRole('button', { name: 'Run synthetic privacy tests' }),
  ).toBeDisabled()
})
it('passes only verified isolated sessions into the existing hosted privacy suite', async () => {
  const a = identity(
    'nisarahmedhidayeti+deardaily-beta@gmail.com',
    'new-email-id',
  )
  const view = await start()
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture current email session' }),
  )
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent(
      'Email session verified',
    ),
  )
  const b = identity('deardailywebsite@gmail.com', 'new-google-id', true, true)
  view.rerender(<RegistrationSecurityCheck />)
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture current google session' }),
  )
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent(
      'Google session verified',
    ),
  )
  mocks.checks.mockResolvedValue({
    passed: true,
    checks: 44,
    cleanup: true,
    stage: 'cleanup',
  })
  await userEvent.click(
    screen.getByRole('button', { name: 'Run synthetic privacy tests' }),
  )
  expect(mocks.checks).toHaveBeenCalledWith(
    a,
    b,
    'new-email-id',
    'new-google-id',
  )
  expect(screen.getByRole('status')).toHaveTextContent(
    'Exact fixture cleanup: PASS',
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Clear test sessions' }),
  )
  expect(
    screen.getByRole('button', { name: 'Run synthetic privacy tests' }),
  ).toBeDisabled()
})
