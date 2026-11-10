import type { SupabaseClient } from '@supabase/supabase-js'
import { expect, it, vi } from 'vitest'
import { publishStory, type JournalEntry } from '../journal/journalApi'
vi.mock('./music', async (original) => ({
  ...(await original<typeof import('./music')>()),
  persistentMusicEnabled: true,
  musicFields: ',music',
}))
it.each(['spotify', 'youtube'] as const)(
  'publishes only approved %s music through the actual API',
  async (provider) => {
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
    const client = {
      from: () => q,
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: { notes: [] }, error: null }),
      },
    } as unknown as SupabaseClient
    const entry = {
      id: 'synthetic',
      title: 'Public',
      body: 'Approved writing',
      music: {
        provider,
        kind: provider === 'youtube' ? 'video' : 'track',
        id: provider === 'youtube' ? 'M7lc1UVf-VE' : '4uLU6hMCjMI75M1A2tKUQC',
        share: false,
      },
    } as JournalEntry
    await publishStory(client, 'A', entry, false)
    expect(insert.mock.calls[0][0].music).toBeNull()
    entry.music!.share = true
    await publishStory(client, 'A', entry, false)
    expect(insert.mock.calls[1][0].music).toEqual({
      provider,
      kind: provider === 'youtube' ? 'video' : 'track',
      id: entry.music!.id,
    })
    expect(insert.mock.calls[1][0].music).not.toHaveProperty('share')
  },
)
