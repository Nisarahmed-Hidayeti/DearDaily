/* global process, URL, fetch, TextEncoder, console */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID, randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'

// Local-only integration test. Read credentials from a private CLI-generated file;
// never print them, sessions, signed URLs, passwords or journal content.
const envFile = process.argv[2]
if (!envFile) throw Error('Pass the local Supabase status env file path')
const env = Object.fromEntries(
  readFileSync(envFile, 'utf8')
    .trim()
    .split('\n')
    .map((line) => {
      const at = line.indexOf('=')
      return [line.slice(0, at), line.slice(at + 1).replace(/^"|"$/g, '')]
    }),
)
assert.equal(
  new URL(env.API_URL).hostname,
  '127.0.0.1',
  'This test is local only',
)
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, options)
const anon = createClient(env.API_URL, env.ANON_KEY, options)
const users = [],
  entries = [],
  tag = randomUUID()
let checks = 0
const check = (condition, label) => {
  assert.ok(condition, label)
  checks++
}
const gateway = `${env.API_URL}/functions/v1/media-gateway`
async function request(token, body, headers = {}) {
  return fetch(gateway, {
    method: 'POST',
    headers: {
      apikey: env.ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body instanceof Uint8Array ? body : JSON.stringify(body),
  })
}
try {
  for (let i = 0; i < 2; i++) {
    const email = `media-${tag}-${i}@example.test`,
      password = randomBytes(32).toString('base64url')
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    assert.ifError(created.error)
    users.push(created.data.user.id)
    const client = createClient(env.API_URL, env.ANON_KEY, options)
    const login = await client.auth.signInWithPassword({ email, password })
    assert.ifError(login.error)
    const id = randomUUID()
    const entry = await client
      .from('journal_entries')
      .insert({
        id,
        user_id: created.data.user.id,
        title: 'Synthetic media check',
        body: 'Synthetic private words',
      })
      .select('id,version')
      .single()
    assert.ifError(entry.error)
    entries.push({
      client,
      id,
      token: login.data.session.access_token,
      version: entry.data.version,
    })
  }
  const signup = await anon.auth.signUp({
    email: `closed-${tag}@example.test`,
    password: randomBytes(32).toString('base64url'),
  })
  check(Boolean(signup.error), 'Public registration remains blocked')
  const [a, b] = entries
  check(users[0] !== users[1], 'Two distinct authenticated users')
  const hidden = await b.client
    .from('journal_entries')
    .select('id')
    .eq('id', a.id)
  check(!hidden.error && hidden.data.length === 0, 'B cannot read A journal')
  check(
    (await request(null, { action: 'read', id: randomUUID() })).status === 401,
    'Anonymous private media blocked',
  )
  const photo = new Uint8Array(readFileSync('public/covers/pacific-dusk.jpg'))
  const upload = await request(a.token, photo, {
    'Content-Type': 'image/jpeg',
    'x-action': 'upload',
    'x-entry-id': a.id,
  })
  check(upload.status === 200, `Trusted photo upload (${upload.status})`)
  const media = await upload.json()
  check(typeof media.id === 'string', 'Upload confirmed')
  const spoof = await request(b.token, photo, {
    'Content-Type': 'image/jpeg',
    'x-action': 'upload',
    'x-entry-id': a.id,
  })
  check(spoof.status === 403, 'B cannot upload to A journal')
  check(
    (await request(b.token, { action: 'read', id: media.id })).status === 404,
    'B cannot sign A private image',
  )
  const read = await request(a.token, { action: 'read', id: media.id })
  check(read.status === 200, 'A can read own private image')
  const signed = await read.json(),
    image = await fetch(signed.url)
  check(
    image.status === 200 &&
      image.headers.get('content-type')?.includes('image/webp'),
    'Private signed image decodes to WebP',
  )
  const direct = await anon.storage
    .from('deardaily-private')
    .download(`${users[0]}/${media.id}.webp`)
  check(Boolean(direct.error), 'Anonymous direct Storage denied')
  const document = {
    version: 1,
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Synthetic approved words' }],
        },
        {
          type: 'journalImage',
          attrs: {
            assetId: media.id,
            alt: 'Synthetic photo',
            width: 'wide',
            align: 'center',
          },
        },
      ],
    },
  }
  const saved = await a.client
    .from('journal_entries')
    .update({ writing_document: document })
    .eq('id', a.id)
    .select('version')
    .single()
  assert.ifError(saved.error)
  const prepared = await request(a.token, {
    action: 'prepare',
    entry: a.id,
    version: saved.data.version,
  })
  check(
    prepared.status === 200,
    `Prepare independent public media (${prepared.status})`,
  )
  const publicCopy = await prepared.json(),
    publicId = publicCopy.document.content.content[1].attrs.publicId
  check(
    !JSON.stringify(publicCopy.document).includes(media.id) &&
      publicId !== media.id,
    'Public document excludes private image identifiers',
  )
  check(
    (await fetch(`${gateway}?public=${publicId}`, { redirect: 'manual' }))
      .status === 404,
    'Unpublished staged photo denied',
  )
  const published = await a.client.from('public_stories').insert({
    id: a.id,
    user_id: users[0],
    title: 'Synthetic public story',
    body: 'Synthetic approved words',
    writing_document: publicCopy.document,
  })
  assert.ifError(published.error)
  const publicRead = await fetch(`${gateway}?public=${publicId}`, {
    redirect: 'manual',
  })
  check(publicRead.status === 302, 'Published image accessible anonymously')
  check(
    (await fetch(publicRead.headers.get('location'))).status === 200,
    'Published image delivery works',
  )
  const cross = await b.client
    .from('journal_entries')
    .update({ writing_document: document })
    .eq('id', b.id)
  check(Boolean(cross.error), 'B cannot attach A image')
  const unsafe = await request(
    a.token,
    new TextEncoder().encode('<svg><script>bad()</script></svg>'),
    { 'Content-Type': 'image/png', 'x-action': 'upload', 'x-entry-id': a.id },
  )
  check(unsafe.status === 400, 'Spoofed unsafe image rejected')
  const unpublished = await a.client
    .from('public_stories')
    .delete()
    .eq('id', a.id)
  assert.ifError(unpublished.error)
  check(
    (await fetch(`${gateway}?public=${publicId}`, { redirect: 'manual' }))
      .status === 404,
    'Unpublish revokes new public requests',
  )
  check(
    (await request(a.token, { action: 'read', id: media.id })).status === 200,
    'Unpublish preserves private original',
  )
  const clean = await request(a.token, { action: 'cleanup' })
  check(
    clean.status === 200 && (await clean.json()).cleaned >= 1,
    'Exact public-copy cleanup succeeds',
  )
} finally {
  for (const entry of entries) {
    assert.ifError(
      (await admin.from('public_stories').delete().eq('id', entry.id)).error,
    )
    assert.ifError(
      (await admin.from('journal_entries').delete().eq('id', entry.id)).error,
    )
    assert.equal(
      (await request(entry.token, { action: 'cleanup' })).status,
      200,
    )
    assert.ifError((await entry.client.auth.signOut()).error)
    assert.equal((await entry.client.auth.getSession()).data.session, null)
  }
  for (const id of users)
    assert.ifError((await admin.auth.admin.deleteUser(id)).error)
}

console.log(
  `PASS: ${checks} local authenticated media integration checks; synthetic fixtures removed and both sessions signed out`,
)
