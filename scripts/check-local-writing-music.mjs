// Local-only API verification. Credentials remain in process memory; never printed.
import { execFileSync } from 'node:child_process'
import { URL } from 'node:url'
import console from 'node:console'
import { randomBytes, randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
const config = JSON.parse(
  execFileSync('node_modules/.bin/supabase', ['status', '--output', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }),
)
const endpoint = new URL(config.API_URL)
assert(
  ['127.0.0.1', 'localhost'].includes(endpoint.hostname),
  'Refusing a non-local project',
)
const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
}
const admin = createClient(endpoint.href, config.SERVICE_ROLE_KEY, options)
const anonymous = createClient(endpoint.href, config.ANON_KEY, options)
const users = []
let checks = 0
const check = (condition, label) => {
  assert(condition, label)
  checks++
}
try {
  for (let i = 0; i < 2; i++) {
    const email = `music-${randomUUID()}@example.test`,
      password = randomBytes(32).toString('base64url')
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    check(!created.error && created.data.user, 'Local account created')
    users.push({
      id: created.data.user.id,
      client: createClient(endpoint.href, config.ANON_KEY, options),
    })
    const signed = await users[i].client.auth.signInWithPassword({
      email,
      password,
    })
    check(
      !signed.error && signed.data.user?.id === users[i].id,
      'Password login works',
    )
  }
  const [a, b] = users
  check(a.id !== b.id, 'Distinct authenticated users')
  const id = randomUUID(),
    selection = {
      provider: 'spotify',
      kind: 'track',
      id: '4uLU6hMCjMI75M1A2tKUQC',
      share: false,
    }
  let response = await a.client
    .from('journal_entries')
    .insert({
      id,
      title: 'Synthetic local soundtrack',
      body: 'Synthetic private words',
      music: selection,
    })
    .select('id,version,music')
    .single()
  check(
    !response.error && response.data.music.share === false,
    'Private music stored and reloaded',
  )
  response = await b.client
    .from('journal_entries')
    .select('id,music')
    .eq('id', id)
  check(!response.error && response.data.length === 0, 'B cannot read A music')
  response = await anonymous
    .from('journal_entries')
    .select('music')
    .eq('id', id)
  check(Boolean(response.error), 'Anonymous private music denied')
  const snapshot = {
    provider: selection.provider,
    kind: selection.kind,
    id: selection.id,
  }
  response = await a.client
    .from('public_stories')
    .insert({
      id,
      user_id: a.id,
      title: 'Synthetic public snapshot',
      body: 'Explicit writing',
      music: snapshot,
    })
  check(Boolean(response.error), 'Raw API rejects unapproved music')
  response = await a.client
    .from('journal_entries')
    .update({ music: { ...selection, share: true } })
    .eq('id', id)
    .eq('version', 1)
    .select('version')
    .single()
  check(
    !response.error && response.data.version === 2,
    'CAS save confirms approval',
  )
  response = await a.client
    .from('public_stories')
    .insert({
      id,
      user_id: a.id,
      title: 'Synthetic public snapshot',
      body: 'Explicit writing',
      music: snapshot,
    })
  check(!response.error, 'Approved public music publishes')
  response = await anonymous
    .from('public_stories')
    .select('id,music')
    .eq('id', id)
    .single()
  check(
    !response.error &&
      JSON.stringify(response.data.music) ===
        JSON.stringify({
          id: selection.id,
          kind: selection.kind,
          provider: selection.provider,
        }),
    'Anonymous sees exactly approved snapshot',
  )
  response = await b.client
    .from('public_stories')
    .update({ music: null })
    .eq('id', id)
    .select('id')
  check(
    !response.error && response.data.length === 0,
    'B cannot replace A public music',
  )
  response = await a.client
    .from('journal_entries')
    .update({ music: null })
    .eq('id', id)
    .eq('version', 2)
  check(!response.error, 'Private selection removed independently')
  response = await anonymous
    .from('public_stories')
    .select('music')
    .eq('id', id)
    .single()
  check(
    !response.error && response.data.music.id === selection.id,
    'Public snapshot remains independent',
  )
  response = await a.client.from('public_stories').delete().eq('id', id)
  check(!response.error, 'Author unpublishes')
  response = await anonymous
    .from('public_stories')
    .select('id,music')
    .eq('id', id)
  check(
    !response.error && response.data.length === 0,
    'Unpublish removes public API access',
  )
  await a.client.auth.signOut()
  response = await a.client.from('journal_entries').select('music').eq('id', id)
  check(Boolean(response.error), 'Logout removes private access')
  console.log(
    `${checks} local authenticated music API checks passed (two distinct users + anonymous).`,
  )
} finally {
  for (const user of users) {
    await user.client.auth.signOut()
    const removed = await admin.auth.admin.deleteUser(user.id)
    assert(!removed.error, 'Exact synthetic local account cleanup failed')
  }
  console.log(
    `Cleaned ${users.length} exact synthetic local test accounts and their fixtures.`,
  )
}
