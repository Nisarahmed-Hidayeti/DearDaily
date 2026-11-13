import console from 'node:console'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'))
assert.equal(manifest.display, 'standalone')
assert.equal(manifest.start_url, '/')
for (const icon of manifest.icons) {
  const pixels = Number(icon.sizes.split('x')[0])
  const png = await readFile('dist' + icon.src)
  assert.equal(png.readUInt32BE(16), pixels)
  assert.equal(png.readUInt32BE(20), pixels)
}
assert.match(await readFile('dist/index.html', 'utf8'), /rel="manifest"/)
await readFile('dist/offline.html')
await readFile('dist/sw.js')
console.log('PWA manifest, icons and offline assets verified')
