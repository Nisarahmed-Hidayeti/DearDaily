/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { imageSize } from 'image-size'
import { expect, it } from 'vitest'
import { photographicCovers, profileCovers } from './covers'
import { documentFromText, validateDocument } from './document'
it('bundles nine real licensed photographs, with validated document IDs and credits', () => {
  expect(photographicCovers).toHaveLength(9)
  for (const cover of photographicCovers) {
    const bytes = readFileSync('public' + cover.src)
    expect(imageSize(bytes).type).toBe('jpg')
    expect(cover.credit.length).toBeGreaterThan(2)
    expect(cover.source).toMatch(/^https:\/\/www\.pexels\.com\/photo\//)
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
