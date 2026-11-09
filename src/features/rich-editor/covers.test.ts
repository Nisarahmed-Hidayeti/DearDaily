/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { imageSize } from 'image-size'
import { expect, it } from 'vitest'
import { photographicCovers, profileCovers, coverThumbnail } from './covers'
import { documentFromText, validateDocument } from './document'
it('bundles licensed photographs and public-domain museum artwork, with validated document IDs and credits', () => {
  expect(photographicCovers.length).toBeGreaterThanOrEqual(80)
  expect(new Set(photographicCovers.map((c) => c.id)).size).toBe(
    photographicCovers.length,
  )
  for (const group of new Set(photographicCovers.map((c) => c.collection)))
    expect(
      photographicCovers.filter((c) => c.collection === group).length,
    ).toBeGreaterThanOrEqual(5)
  for (const cover of photographicCovers) {
    const bytes = readFileSync('public' + cover.src)
    expect(imageSize(bytes).type).toBe('jpg')
    expect(imageSize(readFileSync('public' + coverThumbnail(cover))).type).toBe(
      'jpg',
    )
    expect(cover.credit.length).toBeGreaterThan(2)
    expect(cover.source).toMatch(
      /^https:\/\/(www\.pexels\.com\/photo|www\.metmuseum\.org\/art\/collection\/search|images\.nasa\.gov\/details|science\.nasa\.gov\/asset\/webb)\//,
    )
    expect(
      validateDocument({
        ...documentFromText('Original words'),
        page: { cover: cover.id, position: 63 },
      }).page?.cover,
    ).toBe(cover.id)
  }
})
it('keeps profile banner options within the unchanged hosted allowlist', () => {
  expect(profileCovers.map((c) => c.id)).toEqual([
    'forest-light',
    'pacific-dusk',
    'cafe-memory',
  ])
})

it('ships sharp originals with lightweight previews and traceable licensed source records', () => {
  const manifest = JSON.parse(
    readFileSync('public/covers/SOURCES.json', 'utf8'),
  )
  for (const record of manifest.images) {
    const cover = photographicCovers.find((c) => c.id === record.id)
    expect(cover).toBeDefined()
    const bytes = readFileSync('public' + record.src)
    const size = imageSize(bytes)
    expect(Math.max(size.width, size.height)).toBeGreaterThanOrEqual(1600)
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(2560)
    const thumb = imageSize(readFileSync('public' + record.thumbnail))
    expect(Math.max(thumb.width, thumb.height)).toBeLessThanOrEqual(480)
    expect(record.thumbnail).not.toBe(record.src)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256)
    expect(record.licenseURL).toMatch(/^https:\/\//)
    expect(record.license.length).toBeGreaterThan(10)
  }
})
