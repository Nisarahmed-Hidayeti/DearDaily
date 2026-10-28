import { useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authConfig, supabase } from '../../lib/supabase/client'
import { PageHeading } from '../../components/Shared'
import { useAuth } from './AuthProvider'
import { useNavigate } from 'react-router-dom'
import { hostedJournalChecks } from './hostedJournalChecks'

export default function JournalSecurityCheck() {
  const clients = useRef<Record<string, SupabaseClient>>({})
  const ids = useRef<Record<string, string>>({})
  const [receipts, setReceipts] = useState<Record<string, string>>({})
  const [distinct, setDistinct] = useState(false)
  const [busy, setBusy] = useState(false),
    [passed, setPassed] = useState(false)
  const [message, setMessage] = useState(
    'Sign in each tester. The previous verification signed both users out.',
  )
  const { beginSignIn } = useAuth()
  const navigate = useNavigate()
  async function login(
    event: React.SubmitEvent<HTMLFormElement>,
    label: string,
  ) {
    event.preventDefault()
    if (!authConfig || busy) return
    const form = event.currentTarget,
      email = form.elements.namedItem('email') as HTMLInputElement,
      password = form.elements.namedItem('password') as HTMLInputElement
    const client = createClient(authConfig.url, authConfig.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
    setBusy(true)
    try {
      const result = await client.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value,
      })
      password.value = ''
      if (result.error || !result.data.user) throw Error()
      const verified = await client.auth.getUser()
      if (
        verified.error ||
        verified.data.user?.id !== result.data.user.id ||
        Object.values(ids.current).includes(result.data.user.id)
      )
        throw Error()
      ids.current[label] = result.data.user.id
      clients.current[label] = client
      setDistinct(
        Boolean(
          ids.current.A && ids.current.B && ids.current.A !== ids.current.B,
        ),
      )
      setReceipts((current) => ({
        ...current,
        [label]: result.data.user!.id.slice(-12),
      }))
      setMessage(
        'Verified by Supabase. Identity receipts below come from authenticated user IDs, not email fields.',
      )
    } catch {
      password.value = ''
      await client.auth.signOut({ scope: 'local' })
      setMessage(
        'Login failed or duplicate user ID. Use the other tester for the second login.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function run() {
    if (
      busy ||
      !ids.current.A ||
      !ids.current.B ||
      ids.current.A === ids.current.B
    )
      return
    setBusy(true)
    setMessage('Running synthetic hosted journal/privacy tests…')
    try {
      const result = await hostedJournalChecks(
        clients.current.A,
        clients.current.B,
        ids.current.A,
        ids.current.B,
      )
      const out = await clients.current.B.auth.signOut({ scope: 'local' })
      setPassed(result.passed && !out.error)
      setMessage(
        `${result.passed ? 'PASS' : 'FAIL'}: ${result.checks} hosted journal checks. Distinct authenticated IDs: ${ids.current.A !== ids.current.B ? 'PASS' : 'FAIL'}. Cleanup: ${result.cleanup ? 'PASS' : 'FAIL'}. User B logout: ${out.error ? 'FAIL' : 'PASS'}.${result.failure ? ' Stage: ' + result.stage + '. ' + result.failure : ''}`,
      )
    } catch {
      setMessage(
        'Verification could not finish. Do not enable journals until fixtures and results are reviewed.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function continueWriting() {
    if (!supabase || !passed) return
    const session = await clients.current.A.auth.getSession()
    if (!session.data.session) return
    beginSignIn()
    const result = await supabase.auth.setSession({
      access_token: session.data.session.access_token,
      refresh_token: session.data.session.refresh_token,
    })
    if (result.error) {
      setMessage(
        'Could not restore the writer session. Sign in normally to continue.',
      )
      return
    }
    // Ownership of this same session transfers to the normal app SDK. No password is retained.
    navigate('/app', { replace: true })
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow="Development / Real hosted journal verification"
        title="Two accounts. Two private spaces."
      />
      <p>
        Re-enter each password here only. Passwords are cleared after submission
        and never logged or persisted.
      </p>
      {['A', 'B'].map((label) => (
        <form
          className="panel auth-card"
          key={label}
          onSubmit={(event) => void login(event, label)}
        >
          <h2>User {label}</h2>
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              disabled={busy || Boolean(receipts[label])}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="off"
              disabled={busy || Boolean(receipts[label])}
            />
          </label>
          <button
            className="button"
            disabled={busy || Boolean(receipts[label])}
          >
            {receipts[label] ? 'Login verified' : `Sign in User ${label}`}
          </button>
          {receipts[label] && (
            <p>
              User {label} verified ID ending: {receipts[label]}
            </p>
          )}
        </form>
      ))}
      <p>
        Distinct authenticated IDs:{' '}
        {receipts.A && receipts.B
          ? distinct
            ? 'VERIFIED'
            : 'FAILED'
          : 'waiting for both users'}
      </p>
      <button
        className="button"
        disabled={busy || Object.keys(receipts).length !== 2 || passed}
        onClick={() => void run()}
      >
        Run journal privacy and publishing checks
      </button>
      <p role="status">{message}</p>
      {passed && (
        <button className="button" onClick={() => void continueWriting()}>
          Continue writing as User A
        </button>
      )}
    </div>
  )
}
