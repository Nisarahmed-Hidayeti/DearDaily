import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import { useAuth } from './AuthProvider'
import { hostedJournalChecks } from './hostedJournalChecks'
import { hostedRenaissanceChecks } from './hostedRenaissanceChecks'

const expected = {
  Email: 'nisarahmedhidayeti+deardaily-beta@gmail.com',
  Google: 'deardailywebsite@gmail.com',
} as const
type Label = keyof typeof expected
// Development-only, memory-only session snapshots survive account switching.
// Never serialize credentials or tokens, and never include them in test output.
type Captures = Map<Label, { client: SupabaseClient; id: string }>
const captured: Captures =
  import.meta.hot?.data.registrationSessions ?? new Map()
if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    data.registrationSessions = captured
  })
}
export default function RegistrationSecurityCheck() {
  const { client } = useAuth()
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(
    'Capture each newly verified test account. Keep this tab open while signing into the other account in another localhost tab.',
  )
  const receipts = [...captured.entries()]
  async function capture(label: Label) {
    if (!client || !authConfig || busy) return
    setBusy(true)
    try {
      const current = await client.auth.getSession()
      const verified = await client.auth.getUser()
      const user = verified.data.user
      if (
        verified.error ||
        !user ||
        !user.email_confirmed_at ||
        user.email?.toLowerCase() !== expected[label] ||
        current.data.session?.user.id !== user.id ||
        (label === 'Google' &&
          !user.identities?.some((i) => i.provider === 'google')) ||
        [...captured.entries()].some(
          ([other, value]) => other !== label && value.id === user.id,
        )
      )
        throw Error('Wrong test identity')
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
      const checked = await isolated.auth.getUser()
      if (
        established.error ||
        checked.error ||
        checked.data.user?.id !== user.id
      )
        throw Error('Session not verified')
      captured.set(label, { client: isolated, id: user.id })
      setRevision((n) => n + 1)
      setMessage(
        `${label} session verified by Supabase and retained only in memory.`,
      )
    } catch {
      setMessage(
        `Capture failed. Sign into the confirmed ${expected[label]} account in another localhost tab, then retry. Google capture also requires a Google identity.`,
      )
    } finally {
      setBusy(false)
    }
  }
  async function run(media = false) {
    const a = captured.get('Email'),
      b = captured.get('Google')
    if (!a || !b || a.id === b.id || busy) return
    setBusy(true)
    setMessage(
      'Testing synthetic journals, public snapshots, cross-user isolation and exact cleanup…',
    )
    try {
      const result = await (
        media ? hostedRenaissanceChecks : hostedJournalChecks
      )(a.client, b.client, a.id, b.id)
      setMessage(
        `${result.passed ? 'PASS' : 'FAIL'}: ${result.checks} hosted ${media ? 'media' : 'journal'} checks. Distinct authenticated IDs: PASS. Exact fixture cleanup: ${result.cleanup ? 'PASS' : 'FAIL'}. Stage: ${result.stage}.${result.failure ? ' ' + result.failure : ''}`,
      )
    } catch {
      setMessage(
        'FAIL: verification interrupted. Inspect synthetic fixture cleanup before proceeding.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page" data-capture-revision={revision}>
      <h1>New account privacy checks</h1>
      <p>
        Development only. No passwords are requested. Only the two approved test
        identities can be captured. Real journals are never used as fixtures.
      </p>
      <p role="status">{message}</p>
      {(['Email', 'Google'] as const).map((label) => (
        <section key={label}>
          <h2>{label} test account</h2>
          <p>{expected[label]}</p>
          <p>
            {captured.has(label)
              ? `Verified ID ending: ${captured.get(label)!.id.slice(-12)}`
              : 'Not captured'}
          </p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void capture(label)}
          >
            Capture current {label.toLowerCase()} session
          </button>
        </section>
      ))}
      <p>
        {receipts.length === 2
          ? 'Both approved identities captured.'
          : 'Two distinct confirmed identities are required.'}
      </p>
      <button
        className="button"
        disabled={busy || receipts.length !== 2}
        onClick={() => void run()}
      >
        Run synthetic privacy tests
      </button>
      <button
        className="button secondary"
        disabled={busy || receipts.length !== 2}
        onClick={() => void run(true)}
      >
        Run synthetic media tests
      </button>
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => {
          captured.clear()
          setRevision((n) => n + 1)
          setMessage(
            'Captured sessions released from test memory. Your normal app session remains unchanged.',
          )
        }}
      >
        Clear test sessions
      </button>
    </div>
  )
}
