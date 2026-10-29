/// <reference types="node" />
import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  sanitizePhoto,
  readBounded,
  uploadByteLimit,
} from '../../../supabase/functions/_shared/image'
it('decodes and re-encodes an actual JPEG, removing source metadata', () => {
  const source = new Uint8Array(readFileSync('public/covers/pacific-dusk.jpg'))
  const metadata = new TextEncoder().encode(
    'Exif\0\0DearDaily-private-metadata-sentinel',
  )
  const segment = new Uint8Array([
    255,
    225,
    0,
    metadata.length + 2,
    ...metadata,
  ])
  const input = new Uint8Array([
    ...source.slice(0, 2),
    ...segment,
    ...source.slice(2),
  ])
  const out = sanitizePhoto(input, 'image/jpeg')
  expect(out.width).toBeLessThanOrEqual(1600)
  expect(out.height).toBeLessThanOrEqual(1600)
  expect(out.mime).toBe('image/webp')
  expect(out.bytes.length).toBeLessThanOrEqual(uploadByteLimit)
  const encoded = new TextDecoder().decode(out.bytes)
  expect(encoded).not.toContain('DearDaily-private-metadata-sentinel')
  expect(encoded).not.toContain('EXIF')
  expect(encoded).not.toContain('XMP ')
})
it('rejects spoofed MIME, SVG, malformed image bytes and oversized bodies', async () => {
  expect(() =>
    sanitizePhoto(
      new TextEncoder().encode('<svg><script>bad()</script></svg>'),
      'image/png',
    ),
  ).toThrow()
  expect(() =>
    sanitizePhoto(
      new Uint8Array(readFileSync('public/covers/pacific-dusk.jpg')),
      'image/png',
    ),
  ).toThrow()
  expect(() =>
    sanitizePhoto(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
      'image/png',
    ),
  ).toThrow()
  await expect(
    readBounded(
      new Request('http://localhost', {
        method: 'POST',
        body: new Uint8Array(uploadByteLimit + 1),
      }),
    ),
  ).rejects.toThrow()
})
