import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal, PageHeading } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import { ownerControlsEnabled } from './config'
type Story = {
  id: string
  title: string
  public_username: string | null
  published_at: string
}
type Ban = { author_ref: string; reason: string; created_at: string }
type Decision = { story?: Story; ban?: Ban; action: 'remove' | 'ban' | 'unban' }

export default function OwnerAdmin() {
  const { client } = useAuth()
  const [access, setAccess] = useState<{ owner: boolean; mfa: boolean } | null>(
    null,
  )
  const [stories, setStories] = useState<Story[]>([])
  const [bans, setBans] = useState<Ban[]>([])
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState('Checking protected owner access…')
  const [busy, setBusy] = useState(false)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [reason, setReason] = useState('')
  const [factor, setFactor] = useState<string | null>(null)
  const [qr, setQr] = useState('')
  const [code, setCode] = useState('')
  useEffect(() => {
    if (!client || !ownerControlsEnabled) return
    let active = true
    void (async () => {
      const a = await client.rpc('my_owner_access')
      if (
        a.error ||
        typeof a.data?.owner !== 'boolean' ||
        typeof a.data?.mfa !== 'boolean'
      )
        throw Error()
      if (!active) return
      setAccess(a.data)
      if (!a.data.owner) {
        setMessage('Restricted to the backend-verified owner.')
        return
      }
      if (!a.data.mfa) {
        const factors = await client.auth.mfa.listFactors()
        if (factors.error) throw Error()
        if (active) {
          setFactor(factors.data.totp[0]?.id ?? null)
          setMessage('Verify your authenticator to use owner controls.')
        }
        return
      }
      const [s, b] = await Promise.all([
        client.rpc('owner_public_stories', { page }),
        client.rpc('owner_publishing_bans'),
      ])
      if (
        s.error ||
        b.error ||
        !Array.isArray(s.data) ||
        !Array.isArray(b.data)
      )
        throw Error()
      if (active) {
        setStories(s.data)
        setBans(b.data)
        setMessage('')
      }
    })().catch(() => {
      if (active) {
        setStories([])
        setBans([])
        setMessage(
          'Owner access or loading could not be confirmed. Retry when connected.',
        )
      }
    })
    return () => {
      active = false
    }
  }, [client, page, revision])
  async function enroll() {
    if (!client || busy) return
    setBusy(true)
    try {
      const result = await client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'DearDaily owner ' + new Date().toISOString(),
        issuer: 'DearDaily',
      })
      if (result.error || result.data.type !== 'totp') throw Error()
      setFactor(result.data.id)
      setQr(
        result.data.totp.qr_code.startsWith('data:image/svg+xml')
          ? result.data.totp.qr_code
          : 'data:image/svg+xml;charset=utf-8,' +
              encodeURIComponent(result.data.totp.qr_code),
      )
      setMessage(
        'Scan this QR directly in your authenticator. Keep your authenticator backup secure. Never share this QR or your codes.',
      )
    } catch {
      setMessage(
        'Authenticator setup was not confirmed. No owner action is available. Retry setup when connected.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function verify(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!client || !factor || busy) return
    setBusy(true)
    try {
      const result = await client.auth.mfa.challengeAndVerify({
        factorId: factor,
        code,
      })
      if (result.error) throw Error()
      setCode('')
      setQr('')
      setRevision((n) => n + 1)
    } catch {
      setCode('')
      setMessage(
        'Authenticator verification failed. Use a fresh code and retry. No owner action was performed.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function moderate(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!client || !decision || busy || !reason.trim()) return
    setBusy(true)
    try {
      const result =
        decision.action === 'unban'
          ? await client.rpc('owner_restore_publishing', {
              author_ref: decision.ban!.author_ref,
              reason: reason.trim(),
            })
          : await client.rpc('owner_moderate_story', {
              story: decision.story!.id,
              ban_author: decision.action === 'ban',
              reason: reason.trim(),
            })
      if (result.error) throw Error()
      setDecision(null)
      setReason('')
      setRevision((n) => n + 1)
    } catch {
      setMessage(
        'Decision was not confirmed. Refresh before retrying; permissions and MFA are checked by the backend.',
      )
    } finally {
      setBusy(false)
    }
  }
  if (!ownerControlsEnabled)
    return (
      <div className="page">
        <h1>Owner controls are not enabled yet.</h1>
      </div>
    )
  return (
    <div className="page owner-admin">
      <PageHeading
        eyebrow="Owner / Protected public-content controls"
        title="Care for the public space."
      />
      <p>
        Remove public stories, restrict an author's future publishing, or
        restore publishing. Private journals and private photos remain private.
        Every decision needs a reason and is audited.
      </p>
      <p role="status">{message}</p>
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => setRevision((n) => n + 1)}
      >
        Refresh owner access
      </button>
      {access?.owner && !access.mfa && (
        <section className="panel auth-card">
          <h2>Authenticator verification</h2>
          {!factor && (
            <>
              <p>
                Set up a trusted authenticator app yourself. Do not share the QR
                or any codes with an assistant. Keep a secure authenticator
                backup; automatic owner recovery is not provided here.
              </p>
              <button
                className="button"
                disabled={busy}
                onClick={() => void enroll()}
              >
                Set up owner authenticator
              </button>
            </>
          )}
          {qr && (
            <img
              className="owner-mfa-qr"
              src={qr}
              alt="Private authenticator setup QR — do not share"
            />
          )}
          {factor && (
            <form onSubmit={verify}>
              <label>
                Authenticator code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  required
                  maxLength={6}
                  disabled={busy}
                />
              </label>
              <button className="button" disabled={busy}>
                Verify owner session
              </button>
            </form>
          )}
        </section>
      )}
      {access?.owner && access.mfa && (
        <>
          <h2>Published stories</h2>
          {!stories.length && <p>No stories on this page.</p>}
          {stories.map((story) => (
            <article className="owner-story" key={story.id}>
              <div>
                <Link to={'/explore/published/' + story.id}>{story.title}</Link>
                <p className="tiny muted">
                  {story.public_username
                    ? '@' + story.public_username
                    : 'Anonymous writer'}{' '}
                  · {new Date(story.published_at).toLocaleDateString()}
                </p>
              </div>
              <div className="account-actions">
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    setReason('')
                    setDecision({ story, action: 'remove' })
                  }}
                >
                  Remove story
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    setReason('')
                    setDecision({ story, action: 'ban' })
                  }}
                >
                  Restrict author publishing
                </button>
              </div>
            </article>
          ))}
          <nav className="account-actions" aria-label="Owner story pages">
            <button
              className="button secondary"
              disabled={busy || page === 0}
              onClick={() => setPage((n) => n - 1)}
            >
              Previous
            </button>
            <button
              className="button secondary"
              disabled={busy || stories.length < 50}
              onClick={() => setPage((n) => n + 1)}
            >
              Next
            </button>
          </nav>
          <h2>Publishing restrictions</h2>
          {!bans.length && <p>No active restrictions.</p>}
          {bans.map((ban) => (
            <article className="owner-story" key={ban.author_ref}>
              <div>
                <p>Author reference …{ban.author_ref.slice(-8)}</p>
                <p>{ban.reason}</p>
              </div>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setReason('')
                  setDecision({ ban, action: 'unban' })
                }}
              >
                Restore future publishing
              </button>
            </article>
          ))}
        </>
      )}
      {decision && (
        <Modal
          title={
            decision.action === 'unban'
              ? 'Restore future publishing?'
              : decision.action === 'ban'
                ? 'Restrict this author’s publishing?'
                : 'Remove this public story?'
          }
          onClose={() => {
            if (!busy) setDecision(null)
          }}
        >
          <form onSubmit={moderate}>
            <p>
              {decision.action === 'unban'
                ? 'The author can publish new entries. Previously removed entries stay blocked; old stories are not republished.'
                : decision.action === 'ban'
                  ? 'All of this author’s public stories are removed, and future publishing is blocked. Private writing and account login stay available.'
                  : 'The public copy is removed and this entry cannot be republished. The private source remains saved.'}{' '}
              A reason will be sent privately to the author. Already downloaded
              copies cannot be recalled.
            </p>
            <label>
              Reason
              <textarea
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              />
            </label>
            <div className="account-actions">
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => setDecision(null)}
              >
                Cancel
              </button>
              <button className="button" disabled={busy || !reason.trim()}>
                Confirm decision
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export function OwnerControlsLink() {
  const { client } = useAuth()
  const [owner, setOwner] = useState(false)
  useEffect(() => {
    if (!client || !ownerControlsEnabled) return
    let active = true
    void Promise.resolve(client.rpc('my_owner_access'))
      .then(({ data, error }) => {
        if (active) setOwner(!error && data?.owner === true)
      })
      .catch(() => {
        if (active) setOwner(false)
      })
    return () => {
      active = false
    }
  }, [client])
  return ownerControlsEnabled && owner ? (
    <Link className="button secondary" to="/account/owner">
      Protected owner controls
    </Link>
  ) : null
}
