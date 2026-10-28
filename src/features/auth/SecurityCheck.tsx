import { useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import { PageHeading } from '../../components/Shared'

// Development-only, ordinary user clients. Never uses an admin key or persists credentials.
export default function SecurityCheck() {
  const clients = useRef<Record<string, SupabaseClient>>({})
  const identities = useRef<Record<string, string>>({})
  const [ready, setReady] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(
    'Enter each tester login directly. No passwords or tokens are saved in this report.',
  )
  const [approved, setApproved] = useState(false)
  async function login(
    event: React.SubmitEvent<HTMLFormElement>,
    label: string,
  ) {
    event.preventDefault()
    if (!authConfig) return
    const form = event.currentTarget
    const email = form.elements.namedItem('email') as HTMLInputElement
    const password = form.elements.namedItem('password') as HTMLInputElement
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
      if (result.error || !result.data.user || !result.data.session)
        throw Error()
      if (
        Object.entries(identities.current).some(
          ([key, id]) => key !== label && id === result.data.user.id,
        )
      )
        throw Error()
      const verified = await client.auth.getUser()
      if (verified.error || verified.data.user?.id !== result.data.user.id)
        throw Error()
      clients.current[label] = client
      identities.current[label] = result.data.user.id
      setReady((current) => [...new Set([...current, label])])
      setMessage(`User ${label} login verified.`)
    } catch {
      password.value = ''
      setMessage(
        'Login failed or identities are not distinct. Check the account and try again.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function run() {
    if (!approved || busy || ready.length !== 2) return
    setBusy(true)
    let checks = 0
    const check = (condition: boolean) => {
      if (!condition) throw Error()
      checks++
    }
    const A = clients.current.A,
      B = clients.current.B,
      a = identities.current.A,
      b = identities.current.B
    const created: Array<[SupabaseClient, string, string]> = []
    const anon = createClient(authConfig!.url, authConfig!.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
    try {
      for (const [client, id] of [
        [A, a],
        [B, b],
      ] as const) {
        for (const table of ['profiles', 'user_settings']) {
          const key = table === 'profiles' ? 'id' : 'user_id'
          const existing = await client.from(table).select(key).eq(key, id)
          check(!existing.error && existing.data?.length === 0)
        }
      }
      for (const [client, id, label] of [
        [A, a, 'A'],
        [B, b, 'B'],
      ] as const) {
        const p = await client
          .from('profiles')
          .insert({ id, display_name: `DearDaily security fixture ${label}` })
          .select('id')
          .single()
        check(!p.error && p.data?.id === id)
        created.push([client, 'profiles', id])
        const s = await client
          .from('user_settings')
          .insert({ user_id: id, theme_id: 'forest-green' })
          .select('user_id')
          .single()
        check(!s.error && s.data?.user_id === id)
        created.push([client, 'user_settings', id])
      }
      for (const [client, own, other] of [
        [A, a, b],
        [B, b, a],
      ] as const) {
        for (const table of ['profiles', 'user_settings']) {
          const key = table === 'profiles' ? 'id' : 'user_id'
          const field =
            table === 'profiles'
              ? { display_name: 'attempted cross-user change' }
              : { theme_id: 'paper-white' }
          const ownRead = await client.from(table).select(key).eq(key, own)
          check(!ownRead.error && ownRead.data?.length === 1)
          const otherRead = await client.from(table).select(key).eq(key, other)
          check(!otherRead.error && otherRead.data?.length === 0)
          const update = await client
            .from(table)
            .update(field)
            .eq(key, other)
            .select(key)
          check(!update.error && update.data?.length === 0)
          const remove = await client
            .from(table)
            .delete()
            .eq(key, other)
            .select(key)
          check(!remove.error && remove.data?.length === 0)
          const spoof = await client
            .from(table)
            .insert(
              table === 'profiles'
                ? { id: other, display_name: 'spoof' }
                : { user_id: other, theme_id: 'paper-white' },
            )
          check(Boolean(spoof.error))
          const ownership = await client
            .from(table)
            .update({ [key]: other })
            .eq(key, own)
          check(Boolean(ownership.error))
          const anonymous = await anon.from(table).select(key)
          check(Boolean(anonymous.error))
        }
      }
      for (const [client, id, label] of [
        [A, a, 'A'],
        [B, b, 'B'],
      ] as const) {
        const p = await client
          .from('profiles')
          .select('display_name')
          .eq('id', id)
          .single()
        check(
          !p.error &&
            p.data?.display_name === `DearDaily security fixture ${label}`,
        )
        const s = await client
          .from('user_settings')
          .select('theme_id')
          .eq('user_id', id)
          .single()
        check(!s.error && s.data?.theme_id === 'forest-green')
        const u = await client
          .from('profiles')
          .update({
            display_name: `DearDaily security fixture ${label} updated`,
          })
          .eq('id', id)
          .select('display_name')
          .single()
        check(
          !u.error &&
            u.data?.display_name ===
              `DearDaily security fixture ${label} updated`,
        )
      }
      for (const [client, id] of [
        [A, a],
        [B, b],
      ] as const) {
        const setting = await client
          .from('user_settings')
          .update({ theme_id: 'midnight-purple' })
          .eq('user_id', id)
          .select('theme_id')
          .single()
        check(!setting.error && setting.data?.theme_id === 'midnight-purple')
      }
      setMessage(
        `PASS: ${checks} hosted checks. Cleaning only the synthetic fixtures, then verifying logout…`,
      )
    } catch {
      setMessage(
        `FAIL after ${checks} checks. Security gate remains blocked. Existing records were not intentionally overwritten.`,
      )
    } finally {
      let cleanup = true
      for (const [client, table, id] of created.reverse()) {
        const key = table === 'profiles' ? 'id' : 'user_id'
        const result = await client.from(table).delete().eq(key, id).select(key)
        if (result.error || result.data?.length !== 1) cleanup = false
      }
      let logout = true
      for (const client of [A, B]) {
        const out = await client.auth.signOut({ scope: 'local' })
        const session = await client.auth.getSession()
        const denied = await client.from('profiles').select('id')
        if (out.error || session.data.session || !denied.error) logout = false
      }
      setMessage(
        (previous) =>
          previous +
          ` Cleanup: ${cleanup ? 'PASS' : 'FAILED — inspect fixtures'}. Both logouts and signed-out denial: ${logout ? 'PASS' : 'FAIL'}.`,
      )
      clients.current = {}
      identities.current = {}
      setReady([])
      setBusy(false)
    }
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow="Development / Essential security gate"
        title="Verify the two test accounts."
      />
      <p>
        No admin key, stored passwords, email delivery or public registration is
        used.
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
              autoComplete="username"
              required
              disabled={busy || ready.includes(label)}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="off"
              required
              disabled={busy || ready.includes(label)}
            />
          </label>
          <button className="button" disabled={busy || ready.includes(label)}>
            {ready.includes(label) ? 'Login verified' : `Sign in User ${label}`}
          </button>
        </form>
      ))}
      <p>
        <label>
          <input
            type="checkbox"
            checked={approved}
            onChange={(e) => setApproved(e.target.checked)}
          />{' '}
          I approve creating synthetic profile/settings rows for these testers,
          testing cross-account mutations, and deleting only those fixtures.
          Stop if either account already has profile/settings data.
        </label>
      </p>
      <button
        className="button"
        disabled={busy || ready.length !== 2 || !approved}
        onClick={() => void run()}
      >
        Run hosted isolation and logout checks
      </button>
      <p role="status" style={{ whiteSpace: 'pre-wrap' }}>
        {message}
      </p>
    </div>
  )
}
