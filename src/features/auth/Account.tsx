import { communityEnabled } from '../community/communityApi'
import { journalEnabled } from '../journal/journalApi'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { PageHeading } from '../../components/Shared'

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
        eyebrow="Your account / Closed beta"
        title="A space that belongs to you."
      />
      <p className="muted">
        {journalEnabled
          ? 'Account details and source entries are private. Public stories are separate copies you choose to publish.'
          : 'Account details are private. The dashboard and stories are still fictional samples.'}
      </p>
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
          <Link className="button secondary" to="/account/privacy">
            Export and deletion
          </Link>
        </div>
      )}
      <div className="account-actions">
        <Link className="button secondary" to="/app/settings">
          Appearance settings
        </Link>
        <button
          className="button secondary"
          onClick={async () => {
            await signOut()
            navigate('/', { replace: true })
          }}
        >
          Sign out
        </button>
      </div>
      <p className="auth-footnote">
        Sign-out ends this browser session. Other devices remain signed in.
        {journalEnabled
          ? 'Your saved entries remain in your account after signing out.'
          : 'Journal persistence is planned for Phase 3.'}
      </p>
    </div>
  )
}
