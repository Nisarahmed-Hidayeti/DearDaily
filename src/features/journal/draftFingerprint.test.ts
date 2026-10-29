import { it, expect } from 'vitest'
import { draftFingerprint, newDraft } from './journalApi'
it('ignores JSONB key ordering but detects changed rich text', () => {
  const draft = {
    ...newDraft(),
    writing_document: {
      version: 1 as const,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Saved words' }],
          },
        ],
      },
    },
  }
  const reordered = {
    ...draft,
    writing_document: {
      content: {
        content: [
          {
            content: [{ text: 'Saved words', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
      },
      version: 1 as const,
    },
  }
  expect(draftFingerprint(draft)).toBe(draftFingerprint(reordered))
  reordered.writing_document.content.content[0].content[0].text =
    'Changed words'
  expect(draftFingerprint(draft)).not.toBe(draftFingerprint(reordered))
})
