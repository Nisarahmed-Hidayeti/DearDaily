import { useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import { useAuth } from './AuthProvider'
import { hostedOwnerChecks } from './hostedOwnerChecks'
type Slot = 'low' | 'owner' | 'writer'
type Capture = { client: SupabaseClient; id: string }
const captures: Map<Slot, Capture> =
  import.meta.hot?.data.ownerSessions ?? new Map()
if (import.meta.hot)
  import.meta.hot.dispose((data) => {
    data.ownerSessions = captures
  })
const labels = {
  low: 'owner before MFA',
  owner: 'owner after MFA',
  writer: 'test writer',
}
export default function OwnerSecurityCheck() {
  const { client } = useAuth()
  const [message, setMessage] = useState(
    'Capture the owner before MFA, then the same owner after MFA, then an empty approved test writer. Sessions stay only in this tab’s memory.',
  )
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [receipt, setReceipt] = useState<Awaited<
    ReturnType<typeof hostedOwnerChecks>
  > | null>(null)
  async function capture(slot: Slot) {
    if (!client || !authConfig || busy) return
    setBusy(true)
    try {
      const current = await client.auth.getSession(),
        verified = await client.auth.getUser()
      const user = verified.data.user,
        email = user?.email?.toLowerCase()
      if (
        verified.error ||
        !user?.email_confirmed_at ||
        current.data.session?.user.id !== user.id ||
        (slot === 'writer'
          ? !['deardailywebsite@gmail.com', 'hidayetiahmed@gmail.com'].includes(
              email ?? '',
            )
          : email !== 'nisarahmedhidayeti@gmail.com')
      )
        throw Error()
      const isolated = createClient(authConfig.url, authConfig.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
      const established = await isolated.auth.setSession({
        access_token: current.data.session.access_token,
        refresh_token: current.data.session.refresh_token,
      })
      const identity = await isolated.auth.getUser(),
        access = await isolated.rpc('my_owner_access')
      if (
        established.error ||
        identity.error ||
        identity.data.user?.id !== user.id ||
        access.error ||
        (slot === 'writer'
          ? access.data.owner !== false
          : access.data.owner !== true ||
            access.data.mfa !== (slot === 'owner'))
      )
        throw Error()
      if (
        slot === 'writer' &&
        [...captures.entries()].some(
          ([key, c]) => key !== 'writer' && c.id === user.id,
        )
      )
        throw Error()
      if (
        slot !== 'writer' &&
        (captures.get('writer')?.id === user.id ||
          (captures.get(slot === 'low' ? 'owner' : 'low') &&
            captures.get(slot === 'low' ? 'owner' : 'low')!.id !== user.id))
      )
        throw Error()
      captures.set(slot, { client: isolated, id: user.id })
      setRevision((n) => n + 1)
      setMessage(`Verified ${labels[slot]} session captured only in memory.`)
    } catch {
      setMessage(
        `Capture rejected. Use the confirmed ${slot === 'writer' ? 'approved test-writer' : 'nisarahmedhidayeti@gmail.com owner'} account with the required backend role and MFA level. Never send credentials in chat.`,
      )
    } finally {
      setBusy(false)
    }
  }
  async function run() {
    const low = captures.get('low'),
      owner = captures.get('owner'),
      writer = captures.get('writer')
    if (
      !low ||
      !owner ||
      !writer ||
      low.id !== owner.id ||
      owner.id === writer.id ||
      busy
    )
      return
    setBusy(true)
    setMessage('Running synthetic owner/MFA/ban/media/streak isolation checks…')
    try {
      const result = await hostedOwnerChecks(
        owner.client,
        low.client,
        writer.client,
        owner.id,
        writer.id,
      )
      setReceipt(result)
      setMessage(
        `${result.passed ? 'PASS' : 'FAIL'}: ${result.checks} hosted owner/streak checks. Source fixtures and synthetic restriction cleanup: ${result.cleanup ? 'PASS' : 'FAIL'}. Protected audit/notice cleanup: ${result.protectedAuditCleanupPending ? 'pending exact-ID SQL cleanup' : 'none'}. Stage: ${result.stage}.${result.failure ? ' ' + result.failure : ''}`,
      )
    } catch {
      setMessage(
        'FAIL: test interrupted. Inspect exact synthetic fixture cleanup before proceeding.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page" data-owner-revision={revision}>
      <h1>Owner security verification</h1>
      <p>
        Development only. No passwords or MFA codes are requested here. Use an
        empty approved writer account. Never use real journals or an existing
        public profile as fixtures.
      </p>
      <p role="status">{message}</p>
      {(['low', 'owner', 'writer'] as const).map((slot) => (
        <section key={slot}>
          <h2>{labels[slot]}</h2>
          <p>
            {captures.has(slot)
              ? 'Verified ID ending: ' + captures.get(slot)!.id.slice(-12)
              : 'Not captured'}
          </p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void capture(slot)}
          >
            Capture {labels[slot]}
          </button>
        </section>
      ))}
      <div className="account-actions">
        <button
          className="button"
          disabled={busy || captures.size !== 3}
          onClick={() => void run()}
        >
          Run synthetic owner tests
        </button>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            captures.clear()
            setRevision((n) => n + 1)
            setMessage(
              'Test session snapshots cleared; your normal app session is unchanged.',
            )
          }}
        >
          Clear owner test sessions
        </button>
      </div>
      {receipt && (
        <pre aria-label="Synthetic cleanup receipt">
          {JSON.stringify(
            {
              marker: receipt.marker,
              entries: receipt.fixtureEntryIds,
              notices: receipt.fixtureNoticeIds,
              auditCleanupPending: receipt.protectedAuditCleanupPending,
            },
            null,
            2,
          )}
        </pre>
      )}
    </div>
  )
}
