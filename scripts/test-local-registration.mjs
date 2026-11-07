/* global process, URL, fetch, console, setTimeout */
import { readFileSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Only disposable local accounts. Never logs credentials, messages, links or tokens.
const env = JSON.parse(readFileSync(process.argv[2], 'utf8'))
if (env.API_URL !== 'http://127.0.0.1:54321')
  throw Error('Local Auth tests only')
const mail = env.MAILPIT_URL || env.INBUCKET_URL
if (mail !== 'http://127.0.0.1:54324')
  throw Error('Local mail capture required')
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const client = () => createClient(env.API_URL, env.ANON_KEY, options)
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, options)
const users = [],
  messages = [],
  entries = [],
  run = randomUUID()
let checks = 0,
  runError
const cleanupErrors = []
function check(ok, label) {
  if (!ok) throw Error(label)
  checks++
  console.log(`PASS ${label}`)
}
async function emailToken(address, kind) {
  for (let n = 0; n < 40; n++) {
    const list = await fetch(`${mail}/api/v1/messages`).then((r) => r.json())
    const message = list.messages.find(
      (m) =>
        m.To?.some((to) => to.Address === address) &&
        (kind === 'recovery'
          ? /reset/i.test(m.Subject)
          : /confirm/i.test(m.Subject)),
    )
    if (message) {
      if (!messages.includes(message.ID)) messages.push(message.ID)
      const detail = await fetch(`${mail}/api/v1/message/${message.ID}`).then(
        (r) => r.json(),
      )
      const body = (detail.HTML || detail.Text || '').replaceAll('&amp;', '&')
      const match = body.match(/https?:[^\s"<>]+\/verify\?[^\s"<>]+/)
      if (!match) throw Error('Captured verification link missing')
      const link = new URL(match[0])
      const token = link.searchParams.get('token')
      if (!token || link.searchParams.get('type') !== kind)
        throw Error('Unexpected verification type')
      return token
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw Error('Local verification email was not captured')
}
try {
  for (let i = 0; i < 2; i++) {
    const c = client(),
      email = `signup-${run}-${i}@example.test`
    const password = randomBytes(24).toString('base64url')
    const signup = await c.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: 'http://localhost:5173/auth/callback' },
    })
    check(
      !signup.error && !!signup.data.user?.id && !signup.data.session,
      'Signup awaits email verification',
    )
    users.push({ id: signup.data.user.id, c, email, password })
    const before = await c.auth.signInWithPassword({ email, password })
    check(
      !!before.error && !before.data.session,
      'Unconfirmed password login denied',
    )
    const token = await emailToken(email, 'signup')
    const verified = await c.auth.verifyOtp({
      token_hash: token,
      type: 'signup',
    })
    check(
      !verified.error && verified.data.session?.user.id === signup.data.user.id,
      'Captured email verifies correct new account',
    )
    const reused = await client().auth.verifyOtp({
      token_hash: token,
      type: 'signup',
    })
    check(
      !!reused.error && !reused.data.session,
      'Confirmation link reuse denied',
    )
    const logout = await c.auth.signOut()
    check(
      !logout.error && !(await c.auth.getSession()).data.session,
      'Logout clears session',
    )
    const login = await c.auth.signInWithPassword({ email, password })
    check(
      !login.error && login.data.session?.user.id === signup.data.user.id,
      'Confirmed password login succeeds',
    )
    const id = randomUUID()
    const saved = await c
      .from('journal_entries')
      .insert({
        id,
        user_id: signup.data.user.id,
        title: 'Synthetic registration check',
        body: 'Synthetic private writing',
      })
      .select('id')
      .single()
    check(
      !saved.error && saved.data?.id === id,
      'New user saves private journal',
    )
    entries.push(id)
    await c.auth.signOut()
    await c.auth.signInWithPassword({ email, password })
    const reloaded = await c
      .from('journal_entries')
      .select('id,body')
      .eq('id', id)
      .single()
    check(
      !reloaded.error && reloaded.data?.body === 'Synthetic private writing',
      'Private journal persists after logout and login',
    )
  }
  const [a, b] = users
  check(a.id !== b.id, 'Two genuinely distinct authenticated IDs')
  for (const [owner, attacker, id] of [
    [a, b, entries[0]],
    [b, a, entries[1]],
  ]) {
    const read = await attacker.c
      .from('journal_entries')
      .select('id')
      .eq('id', id)
    check(
      !read.error && read.data.length === 0,
      'Cross-user private read denied',
    )
    const update = await attacker.c
      .from('journal_entries')
      .update({ body: 'Attack' })
      .eq('id', id)
      .select('id')
    check(
      !!update.error || update.data.length === 0,
      'Cross-user private update denied',
    )
    const del = await attacker.c
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .select('id')
    check(
      !!del.error || del.data.length === 0,
      'Cross-user private delete denied',
    )
    const spoof = await attacker.c.from('journal_entries').insert({
      id: randomUUID(),
      user_id: owner.id,
      title: 'Attack',
      body: 'Attack',
    })
    check(!!spoof.error, 'Ownership spoof rejected')
    const intact = await owner.c
      .from('journal_entries')
      .select('body')
      .eq('id', id)
      .single()
    check(
      !intact.error && intact.data?.body === 'Synthetic private writing',
      'Owner data remains intact',
    )
  }
  const anon = client()
  const read = await anon.from('journal_entries').select('id').in('id', entries)
  check(
    !!read.error || read.data.length === 0,
    'Anonymous private journals denied',
  )
  const anonymous = await anon.auth.signInAnonymously()
  check(
    !!anonymous.error && !anonymous.data.session,
    'Anonymous Auth remains disabled',
  )
  const reset = await anon.auth.resetPasswordForEmail(b.email, {
    redirectTo: 'http://localhost:5173/auth/reset-password',
  })
  check(!reset.error, 'Recovery request accepted locally')
  const token = await emailToken(b.email, 'recovery')
  const recoveryClient = client()
  const recovered = await recoveryClient.auth.verifyOtp({
    token_hash: token,
    type: 'recovery',
  })
  check(
    !recovered.error && recovered.data.session?.user.id === b.id,
    'Recovery email verifies correct account',
  )
  const newPassword = randomBytes(24).toString('base64url')
  check(
    !(await recoveryClient.auth.updateUser({ password: newPassword })).error,
    'Synthetic password reset succeeds',
  )
  await recoveryClient.auth.signOut()
  const old = await client().auth.signInWithPassword({
    email: b.email,
    password: b.password,
  })
  check(!!old.error && !old.data.session, 'Old password rejected after reset')
  const fresh = await client().auth.signInWithPassword({
    email: b.email,
    password: newPassword,
  })
  check(
    !fresh.error && fresh.data.session?.user.id === b.id,
    'New password works after reset',
  )
  const replay = await client().auth.verifyOtp({
    token_hash: token,
    type: 'recovery',
  })
  check(!!replay.error && !replay.data.session, 'Recovery link reuse denied')
  console.log(
    `Local registration checks passed: ${checks}. External email, Google signup and hosted CAPTCHA are not covered.`,
  )
} catch (error) {
  runError = error
} finally {
  for (const id of entries) {
    const result = await admin.from('journal_entries').delete().eq('id', id)
    if (result.error) cleanupErrors.push('Exact local entry cleanup failed')
  }
  for (const user of users) {
    const result = await admin.auth.admin.deleteUser(user.id)
    if (result.error) cleanupErrors.push('Exact local user cleanup failed')
  }
  if (messages.length) {
    const result = await fetch(`${mail}/api/v1/messages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: messages }),
    })
    if (!result.ok) cleanupErrors.push('Exact captured email cleanup failed')
  }
  if (!cleanupErrors.length)
    console.log('Exact local synthetic fixtures cleaned.')
}
if (runError) throw runError
if (cleanupErrors.length) throw Error(cleanupErrors.join('; '))
