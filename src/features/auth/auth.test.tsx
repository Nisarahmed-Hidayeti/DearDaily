import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js'
import { AuthProvider, useAuth } from './AuthProvider'
import { AuthPage, RequireAccount } from './AuthPages'
const flags = vi.hoisted(() => ({ allowSignup: false }))
vi.mock('../../lib/supabase/client', () => ({
  supabase: null,
  authConfig: flags,
}))
vi.mock('../../lib/supabase/config', async (original) => ({
  ...(await original<typeof import('../../lib/supabase/config')>()),
  authRedirect: (path: string) => 'http://localhost:5173' + path,
}))
const sessionA = { user: { id: 'user-a' } } as Session
const sessionB = { user: { id: 'user-b' } } as Session
function mockClient(initial: Session | null = null) {
  let callback: (
    event: AuthChangeEvent,
    session: Session | null,
  ) => void = () => {}
  const unsubscribe = vi.fn()
  const auth = {
    onAuthStateChange: vi.fn((listener) => {
      callback = listener
      return { data: { subscription: { unsubscribe } } }
    }),
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: initial }, error: null }),
    signInWithPassword: vi
      .fn()
      .mockResolvedValue({ data: { session: sessionA }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  }
  return {
    client: { auth } as unknown as SupabaseClient,
    auth,
    unsubscribe,
    emit: (event: AuthChangeEvent, session: Session | null) =>
      act(() => callback(event, session)),
  }
}
function form(
  mode: 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password',
  mock = mockClient(),
) {
  render(
    <MemoryRouter>
      <AuthProvider client={mock.client}>
        <Routes>
          <Route path="/" element={<AuthPage mode={mode} />} />
          <Route
            path="/account"
            element={<h1>Private account destination</h1>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
  return mock
}
function StateProbe() {
  const { session, loading, recovery, error, signOut } = useAuth()
  return (
    <>
      <p data-testid="session">
        {loading ? 'loading' : (session?.user.id ?? 'guest')}
      </p>
      <p>{recovery ? 'Recovery verified' : 'No recovery'}</p>
      <p role="status">{error}</p>
      <button onClick={() => void signOut()}>Leave account</button>
    </>
  )
}
describe('auth foundation with mocked Supabase SDK (not live integration)', () => {
  it('keeps forms disabled when configuration is absent', () => {
    render(
      <MemoryRouter>
        <AuthProvider client={null}>
          <AuthPage mode="sign-in" />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    expect(
      screen.getByText(/Account services are not configured/),
    ).toBeVisible()
  })
  it('blocks signup by default, including Google registration', async () => {
    const mock = form('sign-up')
    await waitFor(() => expect(mock.auth.getSession).toHaveBeenCalled())
    expect(
      screen.getByRole('button', { name: 'Create account' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeDisabled()
    expect(mock.auth.signUp).not.toHaveBeenCalled()
  })
  it('submits credentials to the SDK and navigates on success', async () => {
    const mock = form('sign-in')
    await waitFor(() =>
      expect(screen.getByLabelText('Email address')).toBeEnabled(),
    )
    await userEvent.type(
      screen.getByLabelText('Email address'),
      'test@example.test',
    )
    await userEvent.type(screen.getByLabelText('Password'), 'example-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(mock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.test',
      password: 'example-password',
    })
    expect(
      screen.getByRole('heading', { name: 'Private account destination' }),
    ).toBeVisible()
  })
  it('does not expose provider errors or account existence', async () => {
    const mock = mockClient()
    mock.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'secret-provider-message user exists' },
    })
    form('sign-in', mock)
    await waitFor(() =>
      expect(screen.getByLabelText('Email address')).toBeEnabled(),
    )
    await userEvent.type(
      screen.getByLabelText('Email address'),
      'test@example.test',
    )
    await userEvent.type(screen.getByLabelText('Password'), 'example-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to sign in')
    expect(
      screen.queryByText(/secret-provider-message/),
    ).not.toBeInTheDocument()
  })
  it('requests only login scopes and an exact OAuth callback', async () => {
    const mock = form('sign-in')
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Continue with Google' }),
      ).toBeEnabled(),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    )
    expect(mock.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5173/auth/callback',
        scopes: 'openid email profile',
      },
    })
  })
  it('gives a neutral recovery response', async () => {
    const mock = form('forgot-password')
    await waitFor(() =>
      expect(screen.getByLabelText('Email address')).toBeEnabled(),
    )
    await userEvent.type(
      screen.getByLabelText('Email address'),
      'test@example.test',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Send recovery link' }),
    )
    expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.test',
      { redirectTo: 'http://localhost:5173/auth/reset-password' },
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'If this address can receive',
    )
  })
  it('requires a verified recovery event, not just an existing session', async () => {
    const mock = form('reset-password', mockClient(sessionA))
    await waitFor(() =>
      expect(
        screen.queryByText('Restoring your session…'),
      ).not.toBeInTheDocument(),
    )
    expect(
      screen.getByRole('button', { name: 'Update password' }),
    ).toBeDisabled()
    mock.emit('PASSWORD_RECOVERY', sessionA)
    await userEvent.type(
      screen.getByLabelText('New password'),
      'new-example-password',
    )
    await userEvent.type(
      screen.getByLabelText('Confirm password'),
      'new-example-password',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Update password' }),
    )
    expect(mock.auth.updateUser).toHaveBeenCalledWith({
      password: 'new-example-password',
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your password was updated',
    )
  })
  it('uses neutral signup confirmation even for obfuscated duplicate accounts', async () => {
    flags.allowSignup = true
    try {
      const mock = form('sign-up')
      await waitFor(() =>
        expect(screen.getByLabelText('Email address')).toBeEnabled(),
      )
      await userEvent.type(
        screen.getByLabelText('Email address'),
        'test@example.test',
      )
      await userEvent.type(
        screen.getByLabelText('Password'),
        'new-example-password',
      )
      await userEvent.type(
        screen.getByLabelText('Confirm password'),
        'new-example-password',
      )
      await userEvent.click(
        screen.getByRole('button', { name: 'Create account' }),
      )
      expect(mock.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.test',
        password: 'new-example-password',
        options: { emailRedirectTo: 'http://localhost:5173/auth/callback' },
      })
      expect(screen.getByRole('status')).toHaveTextContent(
        'If registration is available',
      )
    } finally {
      flags.allowSignup = false
    }
  })
  it('restores a session, switches identities and unsubscribes on unmount', async () => {
    const mock = mockClient(sessionA)
    const view = render(
      <AuthProvider client={mock.client}>
        <StateProbe />
      </AuthProvider>,
    )
    expect(screen.getByTestId('session')).toHaveTextContent('loading')
    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent('user-a'),
    )
    mock.emit('SIGNED_IN', sessionB)
    expect(screen.getByTestId('session')).toHaveTextContent('user-b')
    mock.emit('SIGNED_OUT', null)
    expect(screen.getByTestId('session')).toHaveTextContent('guest')
    view.unmount()
    expect(mock.unsubscribe).toHaveBeenCalledOnce()
  })
  it('ignores a stale session restore after sign-out', async () => {
    const mock = mockClient()
    let resolve!: (value: unknown) => void
    mock.auth.getSession.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    render(
      <AuthProvider client={mock.client}>
        <StateProbe />
      </AuthProvider>,
    )
    mock.emit('SIGNED_OUT', null)
    await act(async () => {
      resolve({ data: { session: sessionA }, error: null })
    })
    expect(screen.getByTestId('session')).toHaveTextContent('guest')
  })
  it('clears visible account state immediately when signing out fails', async () => {
    const mock = mockClient(sessionA)
    mock.auth.signOut.mockResolvedValue({ error: new Error('Offline') })
    render(
      <AuthProvider client={mock.client}>
        <StateProbe />
      </AuthProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent('user-a'),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Leave account' }))
    expect(screen.getByTestId('session')).toHaveTextContent('guest')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sign-out could not finish',
    )
  })
  it('never renders protected data while loading or signed out', async () => {
    const mock = mockClient()
    render(
      <MemoryRouter initialEntries={['/account']}>
        <AuthProvider client={mock.client}>
          <Routes>
            <Route
              path="/account"
              element={
                <RequireAccount>
                  <p>Secret account content</p>
                </RequireAccount>
              }
            />
            <Route path="/auth/sign-in" element={<p>Sign in destination</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Secret account content')).not.toBeInTheDocument()
    await screen.findByText('Sign in destination')
    expect(screen.queryByText('Secret account content')).not.toBeInTheDocument()
  })
})
