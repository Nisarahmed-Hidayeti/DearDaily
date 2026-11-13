import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import process from 'node:process'

const [apk, apksigner, aapt] = process.argv.slice(2)
if (!apk || !apksigner || !aapt) {
  throw new Error(
    'Usage: node scripts/generate-android-assetlinks.mjs APK APKSIGNER AAPT',
  )
}

const packageName = 'app.deardaily.mobile'
const badging = execFileSync(aapt, ['dump', 'badging', apk], {
  encoding: 'utf8',
})
if (
  !badging.startsWith(`package: name='${packageName}'`) ||
  /^application-debuggable/m.test(badging)
) {
  throw new Error('Use a non-debuggable DearDaily release APK.')
}
const certificate = execFileSync(apksigner, ['verify', '--print-certs', apk], {
  encoding: 'utf8',
})
const digests = [
  ...certificate.matchAll(
    /^Signer #\d+ certificate SHA-256 digest: ([a-f0-9]{64})$/gim,
  ),
]
if (digests.length !== 1 || /CN=Android Debug/i.test(certificate)) {
  throw new Error('Use an APK with one owner-controlled release certificate.')
}
const fingerprint = digests[0][1].toUpperCase().match(/../g).join(':')
const statements = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: packageName,
      sha256_cert_fingerprints: [fingerprint],
    },
  },
]
mkdirSync('public/.well-known', { recursive: true })
writeFileSync(
  'public/.well-known/assetlinks.json',
  JSON.stringify(statements, null, 2) + '\n',
  { flag: 'wx' },
)
