import { expect, it } from 'vitest'
import { approvedPublicProjection } from './publicStoryProjection'
const legacy = {
  id: 'synthetic',
  title: 'Synthetic',
  body: 'Public words',
  published_at: '2026-11-08',
}
const rich = {
  ...legacy,
  writing_document: null,
  page_icon: null,
  cover_preset: null,
  public_username: null,
  public_category: 'Personal',
  public_tags: [],
}
it('accepts exactly the deliberately public fields for each enabled interface', () => {
  expect(approvedPublicProjection(legacy, false, false)).toBe(true)
  expect(approvedPublicProjection(rich, true, true)).toBe(true)
  expect(approvedPublicProjection(legacy, true, true)).toBe(false)
})
it.each([
  'user_id',
  'mood',
  'tags',
  'entry_date',
  'journal_entries',
  'email',
  'version',
])(
  'rejects private or hidden field %s even alongside approved rich data',
  (field) => {
    expect(
      approvedPublicProjection({ ...rich, [field]: 'private' }, true, true),
    ).toBe(false)
  },
)
it('rejects a missing required public field', () => {
  const missing = { ...rich } as Record<string, unknown>
  delete missing.title
  expect(approvedPublicProjection(missing, true, true)).toBe(false)
})
