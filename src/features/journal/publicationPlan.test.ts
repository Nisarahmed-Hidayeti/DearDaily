import { expect, it } from 'vitest'
import {
  documentFromText,
  publicWritingDocument,
  validateDocument,
} from '../rich-editor/document'
import {
  defaultPublicationPlan,
  publicationTags,
  validatePublicationPlan,
} from './publicationPlan'
it('retains explicit public choices in the private document, separately from writing', () => {
  const doc = {
    ...documentFromText('Private original words'),
    publication: { category: 'Travel', tags: 'public, summer', byline: false },
  }
  expect(validateDocument(doc).publication).toEqual(doc.publication)
  const publicCopy = publicWritingDocument(doc)
  expect(publicCopy).not.toHaveProperty('publication')
  expect(publicCopy.content).toEqual(doc.content)
  expect(doc.publication.tags).toBe('public, summer')
})
it('accepts incomplete tag text for private autosave but rejects invalid publication', () => {
  expect(
    validatePublicationPlan({ ...defaultPublicationPlan, tags: 'one,' }).tags,
  ).toBe('one,')
  expect(publicationTags('one, one, two,')).toEqual(['one', 'two'])
  expect(() => publicationTags('a,b,c,d,e,f')).toThrow()
  expect(() => publicationTags('x'.repeat(31))).toThrow()
})
it('rejects injected preferences and never stores arbitrary ownership or style fields', () => {
  for (const value of [
    { ...defaultPublicationPlan, email: 'private@example.test' },
    { ...defaultPublicationPlan, byline: 'true' },
    { ...defaultPublicationPlan, category: '<script>' },
    { ...defaultPublicationPlan, tags: 'a'.repeat(155) },
  ])
    expect(() => validatePublicationPlan(value)).toThrow()
})
