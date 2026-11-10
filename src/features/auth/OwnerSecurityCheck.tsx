import { hostedRhythmChecks } from './hostedRhythmChecks'
import { useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import { authRedirect } from '../../lib/supabase/config'
import { useAuth } from './AuthProvider'
import { hostedOwnerChecks } from './hostedOwnerChecks'
import { hostedMusicChecks } from './hostedMusicChecks'
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
  const [musicProvider, setMusicProvider] = useState<'spotify' | 'youtube'>(
    'spotify',
  )
  const [message, setMessage] = useState(
    'Capture the owner before MFA, then the same owner after MFA, then an empty approved test writer. Sessions stay only in this tab’s memory.',
  )
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [switchUrl, setSwitchUrl] = useState('')
  const [musicReceipt, setMusicReceipt] = useState<Awaited<
    ReturnType<typeof hostedMusicChecks>
  > | null>(null)
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
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          if (!client || !authConfig) return
          setBusy(true)
          try {
            const response = await client.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: authRedirect('/auth/callback'),
                skipBrowserRedirect: true,
                queryParams: { prompt: 'select_account' },
                scopes: 'openid email profile',
              },
            })
            if (
              response.error ||
              !response.data.url ||
              new URL(response.data.url).origin !==
                new URL(authConfig.url).origin
            )
              throw Error()
            setSwitchUrl(response.data.url)
            setMessage(
              'Open Google account selection in a separate tab. Do not sign out: signing out revokes captured sessions.',
            )
          } catch {
            setMessage('Google account switching could not be prepared.')
          } finally {
            setBusy(false)
          }
        }}
      >
        Prepare Google account switch
      </button>
      {switchUrl && (
        <a href={switchUrl} target="_blank" rel="noopener noreferrer">
          Open Google account selection
        </a>
      )}
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
      <label>
        Music test provider
        <select
          value={musicProvider}
          onChange={(event) =>
            setMusicProvider(event.target.value as 'spotify' | 'youtube')
          }
        >
          <option value="spotify">Spotify</option>
          <option value="youtube">YouTube</option>
        </select>
      </label>
      <div className="account-actions">
        <button
          className="button secondary"
          disabled={
            busy ||
            !(captures.has('low') || captures.has('owner')) ||
            !captures.has('writer')
          }
          onClick={async () => {
            const a = captures.get('low') ?? captures.get('owner'),
              b = captures.get('writer')
            if (!a || !b) return
            setBusy(true)
            try {
              setMessage(
                JSON.stringify(
                  await hostedRhythmChecks(
                    a.client,
                    b.client,
                    a.id,
                    b.id,
                    true,
                  ),
                ),
              )
            } catch {
              setMessage(
                'Automatic rhythm checks interrupted; inspect cleanup.',
              )
            } finally {
              setBusy(false)
            }
          }}
        >
          Run synthetic automatic rhythm tests
        </button>
        <button
          className="button secondary"
          disabled={
            busy ||
            !(captures.has('low') || captures.has('owner')) ||
            !captures.has('writer')
          }
          onClick={async () => {
            const a = captures.get('low') ?? captures.get('owner'),
              b = captures.get('writer')
            if (!a || !b) return
            setBusy(true)
            setMessage(
              'Testing optional calendar privacy with synthetic fixtures…',
            )
            try {
              const result = await hostedRhythmChecks(
                a.client,
                b.client,
                a.id,
                b.id,
              )
              setMessage(JSON.stringify(result))
            } catch {
              setMessage(
                'Calendar verification interrupted. Inspect exact cleanup.',
              )
            } finally {
              setBusy(false)
            }
          }}
        >
          Run synthetic calendar tests
        </button>
        <button
          className="button secondary"
          disabled={
            busy ||
            !(captures.has('low') || captures.has('owner')) ||
            !captures.has('writer')
          }
          onClick={async () => {
            const a = captures.get('low') ?? captures.get('owner'),
              b = captures.get('writer')
            if (!a || !b || a.id === b.id) return
            setBusy(true)
            setMessage(
              'Testing exact synthetic music fixtures with two authenticated identities and anonymous access…',
            )
            try {
              const result = await hostedMusicChecks(
                a.client,
                b.client,
                a.id,
                b.id,
                musicProvider,
              )
              setMusicReceipt(result)
              setMessage(
                `${result.passed ? 'PASS' : 'FAIL'}: ${result.checks} hosted music checks. Distinct authenticated IDs: ${result.distinctIdentities ? 'PASS' : 'FAIL'}. Exact cleanup: ${result.cleanup ? 'PASS' : 'FAIL'}. Stage: ${result.stage}.`,
              )
            } catch {
              setMessage(
                'FAIL: music verification interrupted. Inspect exact fixture cleanup.',
              )
            } finally {
              setBusy(false)
            }
          }}
        >
          Run synthetic music tests
        </button>
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
      {musicReceipt && (
        <pre aria-label="Synthetic music cleanup receipt">
          {JSON.stringify(musicReceipt, null, 2)}
        </pre>
      )}
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
