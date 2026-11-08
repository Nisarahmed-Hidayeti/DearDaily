import { communityEnabled } from '../community/communityApi'
import { journalEnabled } from '../journal/journalApi'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { PageHeading } from '../../components/Shared'
import { OwnerControlsLink } from '../admin/OwnerAdmin'
import ModerationNotices from '../admin/ModerationNotices'

export default function Account() {
  const { client, session, signOut } = useAuth()
  const navigate = useNavigate()
  const userId = session!.user.id
  const [name, setName] = useState('')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!client) return
    let active = true
    const load = async () => {
      const result = await client
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle()
      if (result.error) throw result.error
      if (active) {
        setName(result.data?.display_name ?? '')
        setReady(true)
      }
    }
    void load().catch(() => {
      if (active)
        setMessage('Your profile could not load. Reconnect and retry.')
    })
    return () => {
      active = false
    }
  }, [client, userId, attempt])
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client || !ready || busy) return
    setBusy(true)
    setMessage('')
    try {
      // Insert only if absent. A concurrent initializer must not overwrite a profile.
      const existing = await client
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
      if (existing.error) throw existing.error
      const result = existing.data
        ? await client
            .from('profiles')
            .update({ display_name: name.trim() || null })
            .eq('id', userId)
            .select('id')
            .single()
        : await client
            .from('profiles')
            .insert({ id: userId, display_name: name.trim() || null })
            .select('id')
            .single()
      if (result.error || result.data?.id !== userId)
        throw new Error('Profile unavailable')
      setMessage('Your display name is saved to your private account.')
    } catch {
      setMessage('Your profile was not saved. Reconnect and try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow="Your account / Security & privacy"
        title="A space that belongs to you."
      />
      <p className="muted">
        {journalEnabled
          ? 'Account details and source entries are private. Public stories are separate copies you choose to publish.'
          : 'Account details are private. The dashboard and stories are still fictional samples.'}
      </p>
      <div className="account-overview-grid">
        <section className="panel account-identity">
          <p className="eyebrow">Your identity</p>
          <h2>A home for your everyday.</h2>
          <dl>
            <dt>Email address</dt>
            <dd>{session!.user.email}</dd>
            <dt>Email status</dt>
            <dd>
              {session!.user.email_confirmed_at
                ? 'Confirmed'
                : 'Confirmation pending'}
            </dd>
            <dt>Member since</dt>
            <dd>
              {new Date(session!.user.created_at).toLocaleDateString(
                undefined,
                { month: 'long', year: 'numeric' },
              )}
            </dd>
          </dl>
          <p className="tiny muted">
            These account details are private. Your public identity is a
            separate choice.
          </p>
        </section>
        <section className="panel account-security">
          <p className="eyebrow">Security & access</p>
          <h2>Keep your space yours.</h2>
          <p>
            Use a unique password. A recovery code sent to your email verifies
            your identity before you can set a new password.
          </p>
          <Link className="button secondary" to="/auth/forgot-password">
            Password recovery
          </Link>
          <p className="tiny muted">
            Check your inbox and spam folder for the newest code. Never share
            recovery codes or passwords.
          </p>
          <p className="tiny muted">
            Email-address changes and other-device session management are not
            available yet.
          </p>
        </section>
      </div>
      <form className="panel auth-card account-form" onSubmit={save}>
        <label>
          Display name (optional)
          <input
            value={name}
            maxLength={80}
            disabled={!ready || busy}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
          />
        </label>
        <button className="button" disabled={!ready || busy}>
          {busy ? 'Saving…' : 'Save display name'}
        </button>
      </form>
      {message && <p role="status">{message}</p>}
      {!ready && (
        <button
          className="button secondary"
          onClick={() => setAttempt((n) => n + 1)}
        >
          Retry profile loading
        </button>
      )}
      {communityEnabled && (
        <div className="account-actions">
          <Link className="button secondary" to="/account/public-profile">
            Public identity
          </Link>
          <Link className="button secondary" to="/app/published">
            My published stories
          </Link>
          <Link className="button secondary" to="/account/privacy">
            Export and deletion
          </Link>
          <Link className="text-link" to="/moderation">
            Moderation (authorized accounts only)
          </Link>
        </div>
      )}
      <ModerationNotices />
      <div className="account-actions">
        <OwnerControlsLink />
        <Link className="button secondary" to="/app/settings">
          Appearance settings
        </Link>
        <button
          className="button secondary"
          onClick={async () => {
            if (await signOut()) navigate('/', { replace: true })
            else
              setMessage(
                'Sign-out could not be confirmed. Reconnect and try again.',
              )
          }}
        >
          Sign out
        </button>
      </div>
      <p className="auth-footnote">
        Sign-out ends this browser session. Other devices remain signed in.{' '}
        {journalEnabled
          ? 'Your saved entries remain in your account after signing out.'
          : 'Journal persistence is planned for Phase 3.'}
      </p>
    </div>
  )
}
