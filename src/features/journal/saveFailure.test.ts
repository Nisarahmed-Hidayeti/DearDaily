import type { SupabaseClient } from '@supabase/supabase-js'
import { expect, it, vi } from 'vitest'
import { newDraft, saveEntry } from './journalApi'

it.each([
  [0, null, 'retryable'],
  [503, null, 'retryable'],
  [429, null, 'retryable'],
  [401, null, 'auth'],
  [406, 'PGRST116', 'conflict'],
  [409, '23505', 'conflict'],
  [400, '23514', 'failed'],
])(
  'classifies save failures (%s, %s) while retaining the version guard',
  async (status, code, kind) => {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: null, error: { code }, status }),
    }
    const client = { from: () => query } as unknown as SupabaseClient
    await expect(
      saveEntry(client, 'synthetic-owner', 'synthetic-entry', newDraft(), 4),
    ).rejects.toMatchObject({ kind })
    expect(query.eq).toHaveBeenCalledWith('version', 4)
  },
)
