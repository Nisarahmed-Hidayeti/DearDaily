import { expect, it } from 'vitest'
import { validateProfilePanel } from './profilePanel'
it('defaults optional public details off and accepts deliberately shared interests and HTTPS links', () => {
  expect(validateProfilePanel({})).toEqual({
    show_count: false,
    interests: [],
    link: null,
  })
  expect(
    validateProfilePanel({
      show_count: true,
      interests: ['Books'],
      link: 'https://example.org/about',
    }).link,
  ).toBe('https://example.org/about')
})
it('rejects injected fields, active links, credentials and oversized public details', () => {
  for (const value of [
    { role: 'owner' },
    { link: 'javascript:alert(1)' },
    { link: 'https://secret@example.org' },
    { interests: ['<script>'] },
    { interests: Array(7).fill('one') },
    { show_count: 'yes' },
  ])
    expect(() => validateProfilePanel(value)).toThrow()
})
