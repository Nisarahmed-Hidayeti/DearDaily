import type { SupabaseClient } from '@supabase/supabase-js'
import { expect, it, vi } from 'vitest'
import { publishStory, type JournalEntry } from './journalApi'
import { documentFromText } from '../rich-editor/document'
vi.mock('../rich-editor/config', () => ({
  richEditorEnabled: true,
  richPublicFields: ',writing_document,page_icon,cover_preset',
}))
it('the real publishing API strips saved private preferences and never copies private journal metadata', async () => {
  const insert = vi.fn()
  const q = {
    insert: (value: unknown) => {
      insert(value)
      return q
    },
    select: () => q,
    returns: () => q,
    single: async () => ({ data: { id: 'synthetic' }, error: null }),
  }
  const client = { from: () => q } as unknown as SupabaseClient
  const entry = {
    id: 'synthetic',
    title: 'Approved title',
    body: 'Approved writing',
    mood: 'Low',
    tags: ['PRIVATE'],
    category: 'Personal',
    writing_document: {
      ...documentFromText('Approved writing'),
      publication: { category: 'Travel', tags: 'only-public', byline: false },
    },
  } as JournalEntry
  await publishStory(client, 'A', entry, false)
  expect(insert).toHaveBeenCalledOnce()
  const snapshot = insert.mock.calls[0][0]
  expect(snapshot).not.toHaveProperty('mood')
  expect(snapshot).not.toHaveProperty('tags')
  expect(snapshot.writing_document).not.toHaveProperty('publication')
  expect(snapshot.body).toBe('Approved writing')
  expect(entry.writing_document?.publication?.tags).toBe('only-public')
})
