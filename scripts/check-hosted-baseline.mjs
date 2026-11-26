import assert from 'node:assert/strict'

const site = new URL(process.argv[2] ?? 'https://deardaily.com')
assert.equal(site.protocol, 'https:')
assert.equal(site.href, site.origin + '/')
const get = (path) => fetch(new URL(path, site), {
  redirect: 'manual',
  signal: AbortSignal.timeout(15000),
})

const routes = ['/', '/auth/sign-in', '/app', '/app/journal', '/app/write',
  '/app/published', '/explore', '/account/public-profile', '/app/settings',
  '/account/privacy', '/privacy', '/terms']
const html = await Promise.all(routes.map(async (path) => {
  const response = await get(path)
  assert.equal(response.status, 200, `Expected DearDaily shell at ${path}`)
  assert.match(response.headers.get('content-type') ?? '', /^text\/html/)
  const body = await response.text()
  assert.match(body, /<title>DearDaily/)
  console.log('PASS HTTP shell', path)
  return body
}))
const assets = [...new Set([
  ...[...html[0].matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]),
  '/manifest.webmanifest', '/icons/icon-192.png', '/offline.html', '/sw.js',
])]
assert(assets.some((path) => path.endsWith('.js')), 'Missing application entry script')
await Promise.all(assets.map(async (path) => {
  const response = await get(path)
  assert.equal(response.status, 200, `Asset unavailable: ${path}`)
  if (path !== '/offline.html')
    assert.doesNotMatch(response.headers.get('content-type') ?? '', /^text\/html/, `Unexpected SPA fallback for ${path}`)
  if (path === '/sw.js')
    assert.match(response.headers.get('cache-control') ?? '', /no-cache/)
  await response.body?.cancel()
}))
console.log(`PASS ${assets.length} linked and offline assets`)
