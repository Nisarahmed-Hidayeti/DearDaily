import { hostedProfileImageChecks } from './hostedProfileImageChecks'
import { isMediaId } from '../media/mediaApi'
import { useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from './AuthProvider'
import { authConfig } from '../../lib/supabase/client'
import { authRedirect } from '../../lib/supabase/config'
import { hostedVoiceChecks } from './hostedVoiceChecks'
type Capture = { client: SupabaseClient; id: string }
const captures: Map<string, Capture> =
  import.meta.hot?.data.voiceSessions ?? new Map()
if (import.meta.hot)
  import.meta.hot.dispose((data) => {
    data.voiceSessions = captures
  })
export default function VoiceSecurityCheck() {
  const profileMode = location.pathname === '/dev/profile-image-check'
  const label = profileMode ? 'profile image' : 'audio'
  const { client } = useAuth(),
    [message, setMessage] = useState(
      'Capture two different approved confirmed accounts. Passwords and tokens never leave the SDK.',
    ),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [link, setLink] = useState(''),
    [cleanupIds, setCleanupIds] = useState(''),
    [receipt, setReceipt] = useState<
      | Awaited<ReturnType<typeof hostedVoiceChecks>>
      | Awaited<ReturnType<typeof hostedProfileImageChecks>>
      | null
    >(null)
  async function capture(slot: 'A' | 'B') {
    if (!client || !authConfig) return
    setBusy(true)
    try {
      const session = await client.auth.getSession(),
        identity = await client.auth.getUser(),
        user = identity.data.user
      const allowed =
        slot === 'A'
          ? [
              'nisarahmedhidayeti@gmail.com',
              ...(profileMode
                ? ['nisarahmedhidayeti+deardaily-beta@gmail.com']
                : []),
            ]
          : ['deardailywebsite@gmail.com', 'hidayetiahmed@gmail.com']
      if (
        identity.error ||
        !user?.email_confirmed_at ||
        !allowed.includes(user.email?.toLowerCase() ?? '') ||
        !session.data.session ||
        session.data.session.user.id !== user.id ||
        captures.get(slot === 'A' ? 'B' : 'A')?.id === user.id
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
          access_token: session.data.session.access_token,
          refresh_token: session.data.session.refresh_token,
        }),
        verified = await isolated.auth.getUser()
      if (
        established.error ||
        verified.error ||
        verified.data.user?.id !== user.id
      )
        throw Error()
      captures.set(slot, { client: isolated, id: user.id })
      setRevision((n) => n + 1)
      setMessage(`Verified User ${slot} captured in memory.`)
    } catch {
      setMessage(
        `Capture rejected. Sign in as the approved User ${slot}; do not share credentials.`,
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page account-page" data-revision={revision}>
      <p className="eyebrow">Development only</p>
      <h1>
        {profileMode
          ? 'Profile image privacy verification'
          : 'Audio privacy verification'}
      </h1>
      <p role="status">{message}</p>
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          if (!client) return
          const r = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: authRedirect('/auth/callback'),
              skipBrowserRedirect: true,
              queryParams: { prompt: 'select_account' },
              scopes: 'openid email profile',
            },
          })
          if (
            !r.error &&
            r.data.url &&
            new URL(r.data.url).origin === new URL(authConfig!.url).origin
          )
            setLink(r.data.url)
        }}
      >
        Prepare Google account switch
      </button>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer">
          Open Google account selection
        </a>
      )}
      {(['A', 'B'] as const).map((slot) => (
        <section key={slot}>
          <h2>User {slot}</h2>
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
            Capture User {slot}
          </button>
        </section>
      ))}
      <button
        className="button"
        disabled={busy || captures.size !== 2}
        onClick={async () => {
          const a = captures.get('A'),
            b = captures.get('B')
          if (!a || !b || a.id === b.id) return
          setBusy(true)
          setMessage(
            `Testing synthetic ${label}, private ownership, explicit sharing and revocation…`,
          )
          try {
            const result = await (
              profileMode ? hostedProfileImageChecks : hostedVoiceChecks
            )(a.client, b.client, a.id, b.id)
            setReceipt(result)
            setMessage(
              `${result.passed ? 'PASS' : 'FAIL'}: ${result.checks} hosted ${label} checks. Different IDs: ${result.distinctIdentities ? 'PASS' : 'FAIL'}. Cleanup: ${result.cleanup ? 'PASS' : 'FAIL'}. Stage: ${result.stage}. ${result.failure}`,
            )
          } catch {
            setMessage(
              'Verification interrupted; inspect exact fixture cleanup.',
            )
          } finally {
            setBusy(false)
          }
        }}
      >
        Run synthetic {label} tests
      </button>
      {profileMode && receipt && 'fixtureAssetIds' in receipt && (
        <button
          className="button secondary"
          disabled={busy || !receipt.securityPassed}
          onClick={async () => {
            setBusy(true)
            try {
              const ids = [
                ...receipt.fixtureAssetIds,
                ...receipt.fixturePublicIds,
              ]
              for (const capture of captures.values()) {
                const identity = await capture.client.auth.getUser()
                if (identity.error || identity.data.user?.id !== capture.id)
                  throw Error('Fresh verified sessions required')
                const result = await capture.client.functions.invoke(
                  'media-gateway',
                  { body: { action: 'profile-cleanup', ids } },
                )
                const settings = await capture.client.rpc('my_profile_images')
                if (
                  result.error ||
                  result.data?.pending !== 0 ||
                  settings.error ||
                  settings.data.version !== 0
                )
                  throw Error('Protected exact cleanup is still required')
                for (const id of receipt.fixtureAssetIds) {
                  const read = await capture.client.functions.invoke(
                    'media-gateway',
                    { body: { action: 'profile-read', id } },
                  )
                  if (!read.error) throw Error('Fixture remains readable')
                }
              }
              for (const id of receipt.fixturePublicIds) {
                const r = await fetch(
                  `${authConfig!.url}/functions/v1/media-gateway?profile=${id}`,
                  { cache: 'no-store' },
                )
                if (r.ok) throw Error('Public fixture remains readable')
              }
              const updated = {
                ...receipt,
                passed: receipt.securityPassed && receipt.profileCleanup,
                cleanup: true,
                protectedCleanupRequired: false,
                stage: 'complete',
              }
              setReceipt(updated)
              setMessage(
                `${updated.passed ? 'PASS' : 'FAIL'}: ${updated.checks} hosted profile image checks. Exact synthetic cleanup verified.`,
              )
            } catch (e) {
              setMessage((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          Verify exact fixture cleanup
        </button>
      )}
      <button
        className="text-button"
        disabled={busy}
        onClick={() => {
          captures.clear()
          setRevision((n) => n + 1)
          setMessage('Memory-only test sessions cleared.')
        }}
      >
        Clear test captures
      </button>
      {profileMode && (
        <section aria-label="Exact queued fixture cleanup">
          <label>
            Exact fixture image IDs · comma separated
            <input
              value={cleanupIds}
              onChange={(e) => setCleanupIds(e.target.value)}
              disabled={busy}
            />
          </label>
          <button
            className="button secondary"
            disabled={busy || !client}
            onClick={async () => {
              const ids = cleanupIds.split(',').map((id) => id.trim())
              if (
                !client ||
                !ids.length ||
                ids.length > 32 ||
                !ids.every(isMediaId)
              ) {
                setMessage('Enter only the exact reviewed fixture UUIDs.')
                return
              }
              setBusy(true)
              try {
                const result = await client.functions.invoke('media-gateway', {
                  body: { action: 'profile-cleanup', ids },
                })
                if (result.error || result.data?.pending !== 0)
                  throw Error(
                    'Exact object cleanup is not confirmed. Retry when connected.',
                  )
                setMessage(
                  'Exact queued fixture objects cleaned. No active asset or unrelated object was removed.',
                )
              } catch (e) {
                setMessage((e as Error).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            Clean only these queued image objects
          </button>
        </section>
      )}
      {receipt && (
        <pre aria-label="Verification receipt">
          {JSON.stringify(receipt, null, 2)}
        </pre>
      )}
    </div>
  )
}
