import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import OwnerSecurityCheck from './OwnerSecurityCheck'
const state = vi.hoisted(() => ({
  current: {
    id: 'owner-a',
    email: 'nisarahmedhidayeti@gmail.com',
    owner: true,
    mfa: false,
  },
  clients: [] as unknown[],
  run: vi.fn(),
  musicRun: vi.fn(),
}))
vi.mock('../../lib/supabase/client', () => ({
  authConfig: { url: 'https://synthetic.invalid', key: 'synthetic-public-key' },
}))
vi.mock('../../lib/supabase/config', () => ({
  authRedirect: () => 'http://localhost:5173/auth/callback',
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    const snapshot = { ...state.current }
    const isolated = {
      auth: {
        setSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: async () => ({
          data: { user: { id: snapshot.id } },
          error: null,
        }),
      },
      rpc: async () => ({
        data: { owner: snapshot.owner, mfa: snapshot.mfa },
        error: null,
      }),
    }
    state.clients.push(isolated)
    return isolated
  },
}))
vi.mock('./hostedOwnerChecks', () => ({ hostedOwnerChecks: state.run }))
vi.mock('./hostedMusicChecks', () => ({ hostedMusicChecks: state.musicRun }))
vi.mock('./AuthProvider', () => ({ useAuth: () => ({ client: source }) }))
const source = {
  auth: {
    signInWithOAuth: vi.fn().mockResolvedValue({
      data: {
        url: 'https://synthetic.invalid/auth/v1/authorize?provider=google',
      },
      error: null,
    }),
    getSession: async () => ({
      data: {
        session: {
          user: { id: state.current.id },
          access_token: 'synthetic-only-access',
          refresh_token: 'synthetic-only-refresh',
        },
      },
      error: null,
    }),
    getUser: async () => ({
      data: {
        user: {
          id: state.current.id,
          email: state.current.email,
          email_confirmed_at: '2026-11-08T00:00:00Z',
        },
      },
      error: null,
    }),
  },
}
beforeEach(() => {
  state.clients.length = 0
  state.run.mockReset()
  state.musicRun.mockReset()
  state.current = {
    id: 'owner-a',
    email: 'nisarahmedhidayeti@gmail.com',
    owner: true,
    mfa: false,
  }
})
it('prepares a separate-tab Google switch without signing out captured sessions', async () => {
  await mount()
  await userEvent.click(
    screen.getByRole('button', { name: 'Prepare Google account switch' }),
  )
  const link = await screen.findByRole('link', {
    name: 'Open Google account selection',
  })
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  expect(source.auth.signInWithOAuth).toHaveBeenCalledWith(
    expect.objectContaining({
      provider: 'google',
      options: expect.objectContaining({
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
        scopes: 'openid email profile',
      }),
    }),
  )
})
async function mount() {
  render(<OwnerSecurityCheck />)
  await userEvent.click(
    screen.getByRole('button', { name: 'Clear owner test sessions' }),
  )
}
it('rejects a low-assurance owner for the after-MFA capture', async () => {
  await mount()
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture owner after MFA' }),
  )
  expect(await screen.findByText(/Capture rejected/)).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Run synthetic owner tests' }),
  ).toBeDisabled()
  expect(state.run).not.toHaveBeenCalled()
})
it('does not trust the owner email without backend owner membership', async () => {
  state.current.owner = false
  await mount()
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture owner before MFA' }),
  )
  expect(await screen.findByText(/Capture rejected/)).toBeInTheDocument()
  expect(state.run).not.toHaveBeenCalled()
})
it('passes only three independently verified isolated sessions with the required identity relationship', async () => {
  state.run.mockResolvedValue({
    passed: true,
    checks: 1,
    cleanup: true,
    stage: 'synthetic unit dispatch',
    failure: '',
    marker: 'synthetic',
    fixtureEntryIds: [],
    fixtureNoticeIds: [],
    protectedAuditCleanupPending: false,
  })
  await mount()
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture owner before MFA' }),
  )
  await screen.findByText(
    'Verified owner before MFA session captured only in memory.',
  )
  state.current = { ...state.current, mfa: true }
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture owner after MFA' }),
  )
  await screen.findByText(
    'Verified owner after MFA session captured only in memory.',
  )
  state.current = {
    id: 'writer-b',
    email: 'deardailywebsite@gmail.com',
    owner: false,
    mfa: false,
  }
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture test writer' }),
  )
  await screen.findByText(
    'Verified test writer session captured only in memory.',
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Run synthetic owner tests' }),
  )
  await waitFor(() =>
    expect(state.run).toHaveBeenCalledWith(
      state.clients[1],
      state.clients[0],
      state.clients[2],
      'owner-a',
      'writer-b',
    ),
  )
  expect(await screen.findByText(/PASS: 1 hosted owner/)).toBeInTheDocument()
})
it('runs music checks with two verified distinct sessions while retaining the separate owner-MFA gate', async () => {
  state.musicRun.mockResolvedValue({
    passed: true,
    checks: 18,
    cleanup: true,
    stage: 'complete',
    distinctIdentities: true,
    fixtureEntryIds: [],
    marker: 'synthetic',
  })
  await mount()
  expect(
    screen.getByRole('button', { name: 'Run synthetic music tests' }),
  ).toBeDisabled()
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture owner before MFA' }),
  )
  await screen.findByText(
    'Verified owner before MFA session captured only in memory.',
  )
  state.current = {
    id: 'writer-b',
    email: 'deardailywebsite@gmail.com',
    owner: false,
    mfa: false,
  }
  await userEvent.click(
    screen.getByRole('button', { name: 'Capture test writer' }),
  )
  await screen.findByText(
    'Verified test writer session captured only in memory.',
  )
  expect(
    screen.getByRole('button', { name: 'Run synthetic owner tests' }),
  ).toBeDisabled()
  await userEvent.click(
    screen.getByRole('button', { name: 'Run synthetic music tests' }),
  )
  await waitFor(() =>
    expect(state.musicRun).toHaveBeenCalledWith(
      state.clients[0],
      state.clients[1],
      'owner-a',
      'writer-b',
      'spotify',
    ),
  )
  expect(
    await screen.findByText(/PASS: 18 hosted music checks/),
  ).toBeInTheDocument()
  expect(state.run).not.toHaveBeenCalled()
})
