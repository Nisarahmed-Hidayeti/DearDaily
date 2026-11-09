import { expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { saveProfile } from './communityApi'
vi.mock('../rich-editor/studioPolish', () => ({ studioPolishEnabled: true }))
vi.mock('./publicStreakConfig', () => ({ publicStreaksEnabled: true }))
it('confirms new public details with canonical JSON and never writes a backend-owned streak or hidden owner', async () => {
  const profile = {
    username: 'synthetic_writer',
    display_name: 'Synthetic',
    bio: '',
    avatar: 'leaf',
    visible: false,
    joined_month: null,
  }
  const panel = {
    link: 'https://example.org/',
    interests: ['Books'],
    show_count: true,
  }
  const insert = vi.fn().mockResolvedValue({ error: null })
  const select = vi
    .fn()
    .mockReturnValue({
      eq: () => ({
        single: async () => ({
          data: {
            public_panel: {
              show_count: true,
              link: panel.link,
              interests: ['Books'],
            },
            public_streak: null,
          },
          error: null,
        }),
      }),
    })
  const client = {
    from: () => ({ insert, select }),
    rpc: async () => ({ data: profile, error: null }),
  } as unknown as SupabaseClient
  const saved = await saveProfile(
    client,
    { ...profile, public_panel: panel, public_streak: 99 },
    null,
  )
  expect(saved.public_panel).toEqual({
    show_count: true,
    interests: ['Books'],
    link: panel.link,
  })
  expect(insert.mock.calls[0][0]).not.toHaveProperty('public_streak')
  expect(insert.mock.calls[0][0]).not.toHaveProperty('user_id')
  expect(select).toHaveBeenCalledWith('public_streak,public_panel')
})
