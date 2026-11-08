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
  const { client } = useAuth(),
    [message, setMessage] = useState(
      'Capture two different approved confirmed accounts. Passwords and tokens never leave the SDK.',
    ),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [link, setLink] = useState(''),
    [receipt, setReceipt] = useState<Awaited<
      ReturnType<typeof hostedVoiceChecks>
    > | null>(null)
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
              'nisarahmedhidayeti+deardaily-beta@gmail.com',
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
      <h1>Audio privacy verification</h1>
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
            'Testing synthetic audio, private ownership, deliberate publishing and unpublishing…',
          )
          try {
            const result = await hostedVoiceChecks(
              a.client,
              b.client,
              a.id,
              b.id,
            )
            setReceipt(result)
            setMessage(
              `${result.passed ? 'PASS' : 'FAIL'}: ${result.checks} hosted audio checks. Different IDs: ${result.distinctIdentities ? 'PASS' : 'FAIL'}. Cleanup: ${result.cleanup ? 'PASS' : 'FAIL'}. Stage: ${result.stage}. ${result.failure}`,
            )
          } catch {
            setMessage(
              'Audio verification interrupted; inspect exact fixture cleanup.',
            )
          } finally {
            setBusy(false)
          }
        }}
      >
        Run synthetic audio tests
      </button>
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
      {receipt && (
        <pre aria-label="Audio verification receipt">
          {JSON.stringify(receipt, null, 2)}
        </pre>
      )}
    </div>
  )
}
