import { journalEnabled } from '../journal/journalApi'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { Logo } from '../../components/Shared'
import { useAuth } from './AuthProvider'
import { authConfig } from '../../lib/supabase/client'
import { authRedirect, safeNext } from '../../lib/supabase/config'
import './auth.css'
import BotCheck from './BotCheck'

type Mode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password'
const titles: Record<Mode, string> = {
  'sign-in': 'Welcome back to your space.',
  'sign-up': 'A new chapter begins here.',
  'forgot-password': 'Find your way back.',
  'reset-password': 'A fresh start, safely.',
}
export function AuthPage({ mode }: { mode: Mode }) {
  const { client, session, loading, recovery, finishRecovery, beginSignIn } =
    useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [challenge, setChallenge] = useState(0)
  const captchaSiteKey = authConfig?.captchaSiteKey
  const needsBotCheck = !!captchaSiteKey && mode !== 'reset-password'
  useEffect(() => {
    if (mode === 'reset-password' && !loading)
      window.history.replaceState(null, '', location.pathname)
  }, [mode, loading, location.pathname])
  const signupClosed = mode === 'sign-up' && (!authConfig?.allowSignup || !captchaSiteKey)
  const resetUnavailable = mode === 'reset-password' && (!session || !recovery)
  const needsPassword = mode !== 'forgot-password'
  const needsConfirmation = mode === 'sign-up' || mode === 'reset-password'
  const disabled =
    !client || busy || loading || signupClosed || resetUnavailable
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client || disabled || (needsBotCheck && !captchaToken)) return
    setError('')
    setMessage('')
    if (needsConfirmation && password !== confirmation) {
      setError('The passwords do not match. Please try again.')
      return
    }
    if (needsConfirmation && (password.length < 12 || password.length > 128)) { setError('Use a password between 12 and 128 characters.'); return }
    setBusy(true)
    try {
      if (mode === 'sign-in') {
        beginSignIn()
        const result = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
          ...(needsBotCheck ? { options: { captchaToken } } : {}),
        })
        if (result.error) throw result.error
        setPassword('')
        navigate(safeNext(new URLSearchParams(location.search).get('next')), {
          replace: true,
        })
      } else if (mode === 'sign-up') {
        beginSignIn()
        const result = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: authRedirect('/auth/callback'), captchaToken },
        })
        if (result.error) throw result.error
        // Same response for new, duplicate and obfuscated accounts.
        setPassword('')
        setConfirmation('')
        setMessage(
          'If registration is available for this address, check your inbox to confirm your email. Already registered? Sign in or reset your password.',
        )
      } else if (mode === 'forgot-password') {
        const result = await client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authRedirect('/auth/reset-password'),
          ...(needsBotCheck ? {captchaToken} : {}),
        })
        if (result.error) throw result.error
        setMessage(
          'If this address can receive recovery email, a link will arrive shortly. Open it in this browser and tab.',
        )
      } else {
        const result = await client.auth.updateUser({ password })
        if (result.error) throw result.error
        setPassword('')
        setConfirmation('')
        finishRecovery()
        setMessage('Your password was updated. You can return to your account.')
      }
    } catch {
      // Do not render provider messages, email existence, tokens, or raw errors.
      setError(
        mode === 'sign-in'
          ? 'Unable to sign in. Check your details and email confirmation, or try your original sign-in provider.'
          : 'We could not complete this request. Check your connection and try again later.',
      )
    } finally {
      setCaptchaToken(''); setChallenge(current => current + 1)
      setBusy(false)
    }
  }
  async function google() {
    if (!client || busy) return
    setBusy(true)
    setError('')
    try {
      beginSignIn()
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authRedirect('/auth/callback'),
          scopes: 'openid email profile',
        },
      })
      if (error) throw error
    } catch {
      setError(
        'Google sign-in is unavailable. Try again later or use your original sign-in method.',
      )
      setBusy(false)
    }
  }
  return (
    <main id="main" tabIndex={-1} className="auth-layout">
      <div className="auth-brand">
        <Logo />
        <Link to="/">Back home</Link>
      </div>
      <section className="panel auth-card">
        <p className="eyebrow">DearDaily / {authConfig?.allowSignup && captchaSiteKey ? 'Your private space' : 'Closed beta'}</p>
        <h1>{titles[mode]}</h1>
        <p className="muted">
          Your account is personal. Your story stays yours.
        </p>
        {!client && (
          <p role="status" className="auth-notice">
            Account services are not configured yet. You can still explore the
            sample experience.
          </p>
        )}
        {signupClosed && (
          <p className="auth-notice">
            Registration is currently closed while email delivery and account protections are being verified. Existing testers can still sign in.
          </p>
        )}
        {resetUnavailable && !loading && !message && (
          <p className="auth-notice">
            Open a fresh recovery link in the same browser and tab where you
            requested it. For your safety, this page requires a recovery
            session.
          </p>
        )}
        {loading && <p role="status">Restoring your session…</p>}
        <form onSubmit={submit}>
          {mode !== 'reset-password' && (
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={disabled}
              />
            </label>
          )}
          {needsPassword && (
            <label>
              {mode === 'reset-password' ? 'New password' : 'Password'}
              <input
                type="password"
                autoComplete={
                  mode === 'sign-in' ? 'current-password' : 'new-password'
                }
                required
                minLength={needsConfirmation ? 12 : undefined}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={disabled}
              />
            </label>
          )}
          {needsConfirmation && (
            <>
              <p className="muted">
                Use at least 12 characters and a unique password.
              </p>
              <label>
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  maxLength={128}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  disabled={disabled}
                />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="auth-notice">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="auth-notice">
              {message}
            </p>
          )}
          {needsBotCheck && !signupClosed && <BotCheck key={challenge} siteKey={captchaSiteKey!} onToken={setCaptchaToken}/>}
          <button className="button" disabled={disabled || (needsBotCheck && !captchaToken)}>
            {busy
              ? 'Please wait…'
              : {
                  'sign-in': 'Sign in',
                  'sign-up': 'Create account',
                  'forgot-password': 'Send recovery link',
                  'reset-password': 'Update password',
                }[mode]}
            <ArrowRight size={16} />
          </button>
        </form>
        {(mode === 'sign-in' || mode === 'sign-up') && (
          <button
            className="button secondary"
            disabled={!client || busy || loading || signupClosed}
            onClick={google}
          >
            Continue with Google
          </button>
        )}
        <nav className="auth-links" aria-label="Account help">
          {mode !== 'sign-in' && <Link to="/auth/sign-in">Sign in</Link>}
          {mode === 'sign-in' && (
            <>
              <Link to="/auth/forgot-password">Forgot password?</Link>
              <Link to="/auth/sign-up">Create an account</Link>
            </>
          )}
          {mode === 'reset-password' && (
            <Link to="/auth/forgot-password">Request a new recovery link</Link>
          )}
          {message && mode === 'reset-password' && (
            <Link to="/account">Return to account</Link>
          )}
          <Link to="/app">Explore the sample dashboard</Link>
        </nav>
        <p className="auth-footnote">
          <LockKeyhole size={14} />{' '}
          {journalEnabled
            ? 'Save private entries in your account. Publish only with explicit confirmation.'
            : 'No journal storage or publishing is available yet.'}
        </p>
      </section>
    </main>
  )
}
export function AuthCallback() {
  const { session, loading, recovery, client } = useAuth()
  const location = useLocation()
  // Capture only the presence of an error. Never render callback token/error values.
  const [invalid] = useState(
    () =>
      new URLSearchParams(location.search).has('error') ||
      new URLSearchParams(location.hash.slice(1)).has('error'),
  )
  useEffect(() => {
    // SDK initialization owns the PKCE exchange. Remove callback data from history
    // only after it finishes so refresh/back cannot replay or expose a code.
    if (!loading) window.history.replaceState(null, '', location.pathname)
  }, [loading, location.pathname])
  if (!loading && session && !invalid)
    return (
      <Navigate replace to={recovery ? '/auth/reset-password' : '/account'} />
    )
  return (
    <main id="main" tabIndex={-1} className="auth-layout">
      <Logo />
      <section className="panel auth-card">
        <h1>{loading ? 'Opening your space…' : 'Let’s try that again.'}</h1>
        <p role="status">
          {loading
            ? 'Verifying your sign-in link.'
            : !client
              ? 'Account services are not configured.'
              : 'This link may be expired, already used, or opened in a different browser. Request a new link and open it where you started.'}
        </p>
        <Link to="/auth/sign-in">Back to sign in</Link>
      </section>
    </main>
  )
}
export function RequireAccount({ children }: { children: React.ReactNode }) {
  const { session, loading, error, recovery } = useAuth()
  if (loading)
    return (
      <div className="page" role="status">
        Restoring your account…
      </div>
    )
  if (recovery) return <Navigate replace to="/auth/reset-password" />
  if (!session || error)
    return <Navigate replace to="/auth/sign-in?next=%2Faccount" />
  return children
}
