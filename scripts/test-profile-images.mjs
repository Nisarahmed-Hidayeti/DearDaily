/* global process, URL, fetch, Request, console */
import { createClient } from '@supabase/supabase-js'
import { PhotonImage, resize, SamplingFilter } from '@cf-wasm/photon/node'
import { readFileSync } from 'node:fs'
import { randomUUID, randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
import { createMediaHandler } from '../supabase/functions/_shared/mediaHandler.ts'
const path = process.argv[2]
if (!path) throw Error('Local-only status file required')
const env = Object.fromEntries(
  readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, '')]
    }),
)
assert.ok(
  ['127.0.0.1', 'localhost'].includes(new URL(env.API_URL).hostname),
  'Refusing non-local target',
)
const opts = { auth: { persistSession: false, autoRefreshToken: false } },
  admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, opts),
  anon = createClient(env.API_URL, env.ANON_KEY, opts)
const handler = createMediaHandler(
  admin,
  (authorization) =>
    createClient(env.API_URL, env.ANON_KEY, {
      ...opts,
      global: { headers: { Authorization: authorization } },
    }),
  ['http://localhost:5173'],
  env.API_URL,
)
const tag = randomUUID(),
  users = [],
  assets = [],
  copies = [],
  clients = []
let checks = 0
const check = (value, label) => {
  assert.ok(value, label)
  checks++
}
const call = (token, body, headers = {}) =>
  handler(
    new Request(env.API_URL + '/functions/v1/media-gateway', {
      method: 'POST',
      headers: {
        ...(token ? { authorization: 'Bearer ' + token } : {}),
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        ...headers,
      },
      body: body instanceof Uint8Array ? body : JSON.stringify(body),
    }),
  )
const publicGet = (id) =>
  handler(
    new Request(env.API_URL + '/functions/v1/media-gateway?profile=' + id),
  )
const upload = async (token, bytes, kind) => {
  const r = await call(token, bytes, {
    'content-type': 'image/webp',
    'x-action': 'profile-upload',
    'x-profile-kind': kind,
  })
  check(r.status === 200, 'owner upload confirmed')
  const d = await r.json()
  assets.push(d.id)
  return d.id
}
try {
  for (let i = 0; i < 2; i++) {
    const email = `profile-${tag}-${i}@example.test`,
      password = randomBytes(32).toString('base64url')
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    assert.ifError(created.error)
    users.push(created.data.user.id)
    const client = createClient(env.API_URL, env.ANON_KEY, opts),
      login = await client.auth.signInWithPassword({ email, password })
    assert.ifError(login.error)
    clients.push({
      client,
      token: login.data.session.access_token,
      id: created.data.user.id,
      handle: 'p' + tag.replaceAll('-', '').slice(0, 16) + i,
    })
  }
  const [a, b] = clients
  check(a.id !== b.id, 'two genuinely different authenticated sessions')
  const inserted = await a.client.from('public_profiles').insert({
    username: a.handle,
    display_name: 'Synthetic profile image A',
    avatar: 'leaf',
    visible: true,
  })
  assert.ifError(inserted.error)
  const source = PhotonImage.new_from_byteslice(
      new Uint8Array(readFileSync('public/covers/pacific-dusk.jpg')),
    ),
    square = resize(source, 512, 512, SamplingFilter.Lanczos3),
    wide = resize(source, 1600, 640, SamplingFilter.Lanczos3)
  const avatarBytes = square.get_bytes_webp(),
    bannerBytes = wide.get_bytes_webp()
  square.free()
  wide.free()
  source.free()
  check(
    (
      await call(null, avatarBytes, {
        'x-action': 'profile-upload',
        'x-profile-kind': 'avatar',
        'content-type': 'image/webp',
      })
    ).status === 401,
    'anonymous upload rejected',
  )
  check(
    (
      await call(a.token, new Uint8Array([1, 2, 3]), {
        'x-action': 'profile-upload',
        'x-profile-kind': 'avatar',
        'content-type': 'image/webp',
      })
    ).status === 400,
    'unsafe image rejected',
  )
  const avatar = await upload(a.token, avatarBytes, 'avatar'),
    banner = await upload(a.token, bannerBytes, 'banner')
  const read = await call(a.token, { action: 'profile-read', id: avatar })
  check(read.status === 200, 'A can read own processed avatar')
  const signed = await read.json()
  check((await fetch(signed.url)).ok, 'authenticated avatar bytes delivered')
  check(
    (await call(b.token, { action: 'profile-read', id: avatar })).status >= 400,
    'B cannot read A private avatar',
  )
  check(
    (await call(null, { action: 'profile-read', id: avatar })).status === 401,
    'anonymous private read rejected',
  )
  check(
    Boolean(
      (await b.client.from('profile_image_assets').delete().eq('id', avatar))
        .error,
    ),
    'B direct deletion rejected',
  )
  check(
    Boolean(
      (
        await b.client.storage
          .from('deardaily-private')
          .download('profile/' + a.id + '/' + avatar + '.webp')
      ).error,
    ),
    'B direct private Storage download denied',
  )
  const base = {
    action: 'profile-save',
    avatar_asset: avatar,
    banner_asset: banner,
    share_avatar: false,
    share_banner: false,
    banner_position: 75,
    version: 0,
  }
  check(
    (await call(b.token, base)).status >= 400,
    'cross-user settings spoof rejected',
  )
  let r = await call(a.token, base)
  check(r.status === 200, 'private image settings saved')
  let settings = (await r.json()).settings
  const reload = await a.client.rpc('my_profile_images')
  assert.ifError(reload.error)
  check(
    reload.data.avatar_asset === avatar &&
      reload.data.banner_asset === banner &&
      reload.data.banner_position === 75,
    'save/reload retains both images and position',
  )
  let pub = await anon.rpc('public_profile_images', { handle: a.handle })
  assert.ifError(pub.error)
  check(
    !pub.data.avatar && !pub.data.banner,
    'private uploads do not become public automatically',
  )
  check(
    (await call(a.token, base)).status === 400,
    'stale concurrent save rejected',
  )
  check(
    (await publicGet(avatar)).status === 404,
    'private asset cannot be used as public ID',
  )
  r = await call(a.token, {
    ...base,
    version: settings.version,
    share_avatar: true,
    share_banner: true,
  })
  check(r.status === 200, 'explicit independent public consent accepted')
  settings = (await r.json()).settings
  pub = await anon.rpc('public_profile_images', { handle: a.handle })
  assert.ifError(pub.error)
  const approved = pub.data
  copies.push(approved.avatar, approved.banner)
  check(
    Object.keys(approved).sort().join(',') === 'avatar,banner,banner_position',
    'public interface returns only approved fields',
  )
  check(
    approved.avatar !== avatar && approved.banner !== banner,
    'independent public identifiers hide private sources',
  )
  for (const id of [approved.avatar, approved.banner]) {
    const response = await publicGet(id)
    check(
      response.status === 302,
      'anonymous published profile image authorized',
    )
    check(
      (await fetch(response.headers.get('location'))).ok,
      'public profile image bytes delivered',
    )
  }
  check(
    Boolean(
      (
        await anon.storage
          .from('deardaily-story-media')
          .download('profile/' + approved.avatar + '.webp')
      ).error,
    ),
    'anonymous direct bucket download denied',
  )
  const hidden = await a.client
    .from('public_profiles')
    .update({ visible: false })
    .eq('username', a.handle)
  assert.ifError(hidden.error)
  pub = await anon.rpc('public_profile_images', { handle: a.handle })
  check(!pub.data, 'hidden profile metadata denied')
  for (const id of [approved.avatar, approved.banner])
    check(
      (await publicGet(id)).status === 404,
      'hidden profile public access revoked',
    )
  const current = await a.client.rpc('my_profile_images')
  assert.ifError(current.error)
  check(
    current.data.avatar_asset === avatar &&
      !current.data.share_avatar &&
      !current.data.share_banner,
    'hiding preserves originals and clears consent',
  )
  const visible = await a.client
    .from('public_profiles')
    .update({ visible: true })
    .eq('username', a.handle)
  assert.ifError(visible.error)
  pub = await anon.rpc('public_profile_images', { handle: a.handle })
  check(
    !pub.data.avatar && !pub.data.banner,
    'unhiding does not republish old photos',
  )
  const replacement = await upload(a.token, avatarBytes, 'avatar')
  r = await call(a.token, {
    ...base,
    avatar_asset: replacement,
    banner_asset: null,
    version: current.data.version,
  })
  check(r.status === 200, 'replace avatar and remove banner')
  settings = (await r.json()).settings
  r = await call(a.token, {
    ...base,
    avatar_asset: null,
    banner_asset: null,
    version: settings.version,
  })
  check(r.status === 200, 'remove avatar restores icon fallback')
  check(
    (await call(a.token, { action: 'profile-cleanup' })).status === 200,
    'owner-scoped cleanup available',
  )
  const other = await b.client.rpc('my_profile_images')
  check(
    !other.data.avatar_asset && !other.data.banner_asset,
    'B retains separate empty settings',
  )
  console.log(`PASS ${checks} real local profile-image checks`)
} finally {
  // Exact IDs created in this isolated local workflow only; no hosted target permitted.
  if (assets.length) {
    const r = await admin
      .from('profile_image_assets')
      .select('object_key')
      .in('id', assets)
    if (r.data?.length)
      assert.ifError(
        (
          await admin.storage
            .from('deardaily-private')
            .remove(r.data.map((x) => x.object_key))
        ).error,
      )
  }
  if (users.length) {
    const gc = await admin
      .from('media_gc')
      .select('id,bucket,object_key')
      .in('user_id', users)
      .like('object_key', 'profile/%')
    for (const job of gc.data ?? []) {
      assert.ifError(
        (await admin.storage.from(job.bucket).remove([job.object_key])).error,
      )
      assert.ifError(
        (await admin.from('media_gc').delete().eq('id', job.id)).error,
      )
    }
    const remaining = await admin
      .from('profile_image_copies')
      .select('object_key')
      .in('user_id', users)
    if (remaining.data?.length)
      assert.ifError(
        (
          await admin.storage
            .from('deardaily-story-media')
            .remove(remaining.data.map((x) => x.object_key))
        ).error,
      )
    for (const id of users)
      assert.ifError((await admin.auth.admin.deleteUser(id)).error)
    const queued = await admin
      .from('media_gc')
      .select('id,bucket,object_key')
      .in('user_id', users)
      .like('object_key', 'profile/%')
    for (const job of queued.data ?? []) {
      assert.ifError(
        (await admin.storage.from(job.bucket).remove([job.object_key])).error,
      )
      assert.ifError(
        (await admin.from('media_gc').delete().eq('id', job.id)).error,
      )
    }
    const leftovers = await admin
      .from('profile_image_assets')
      .select('id', { count: 'exact' })
      .in('user_id', users)
    assert.equal(leftovers.count, 0)
  }
  console.log('PASS exact synthetic cleanup')
}
