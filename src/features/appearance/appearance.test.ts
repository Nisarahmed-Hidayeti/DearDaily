import { it, expect } from 'vitest'
import {
  validateAppearance,
  defaultAppearance,
  appearanceTokens,
  contrast,
  themeBackgrounds,
} from './appearance'
it('accepts only bounded style tokens, never CSS or journal fields', () => {
  expect(validateAppearance({})).toEqual(defaultAppearance)
  for (const value of [
    { accent: 'url(https://tracker.invalid)' },
    { background: 'red;display:none' },
    { size: 999 },
    { font: null },
    { body: 'private words' },
    { width: '999px' },
  ])
    expect(() => validateAppearance(value)).toThrow()
})
it('derives readable text, controls and accents across light/dark custom colors', () => {
  for (const background of [
    '#ffffff',
    '#000000',
    '#888888',
    '#ffeedd',
    '#33114f',
  ])
    for (const accent of ['#ffffff', '#000000', '#888888', '#ffff00']) {
      const p = { ...defaultAppearance, background, accent },
        t = appearanceTokens(p)
      expect(contrast(background, t['--text'])).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t['--accent'], t['--on-accent'])).toBeGreaterThanOrEqual(
        4.5,
      )
      expect(contrast(background, t['--accent'])).toBeGreaterThanOrEqual(4.5)
    }
})
it('keeps all four theme defaults when no custom color is chosen', () => {
  for (const bg of Object.values(themeBackgrounds)) {
    const t = appearanceTokens(defaultAppearance, bg)
    expect(t['--bg']).toBeUndefined()
    expect(t['--accent']).toBeUndefined()
  }
})
