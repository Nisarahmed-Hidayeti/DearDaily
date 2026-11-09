import { expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  profileImageSave,
  profilePublicImage,
  profileMediaRequest,
} from '../../../supabase/functions/_shared/profileImages'
import { createMediaHandler } from '../../../supabase/functions/_shared/mediaHandler'
const id = '95000000-0000-4000-8000-000000000001'
it('rejects ownership fields, paths, missing consent and malformed saved settings', () => {
  const valid = {
    action: 'profile-save',
    avatar_asset: id,
    banner_asset: null,
    share_avatar: false,
    share_banner: false,
    banner_position: 50,
    version: 0,
  }
  expect(profileImageSave(valid)).toEqual(valid)
  for (const patch of [
    { user_id: id },
    { avatar_asset: '../object' },
    { share_avatar: 'true' },
    { banner_position: 101 },
    { version: -1 },
    { avatar_asset: null, share_avatar: true },
  ])
    expect(() => profileImageSave({ ...valid, ...patch })).toThrow()
})
it('does not sign a hidden or unapproved public image', async () => {
  const storage = vi.fn(),
    rpc = vi.fn(async () => ({ data: null, error: null }))
  expect(
    await profilePublicImage(
      { rpc, storage: { from: storage } } as unknown as SupabaseClient,
      id,
    ),
  ).toBeNull()
  expect(storage).not.toHaveBeenCalled()
})
it('validates profile requests before any privileged access', async () => {
  const from = vi.fn(() => {
      throw Error('Unexpected access')
    }),
    admin = { from } as unknown as SupabaseClient
  const handler = createMediaHandler(
    admin,
    () =>
      ({
        auth: { getUser: async () => ({ data: { user: null }, error: {} }) },
      }) as unknown as SupabaseClient,
    ['https://safe.invalid'],
  )
  for (const headers of [
    {},
    { authorization: 'Bearer invalid' },
    { origin: 'https://hostile.invalid', authorization: 'Bearer invalid' },
  ] as Record<string, string>[])
    expect(
      (
        await handler(
          new Request('https://local.invalid', {
            method: 'POST',
            headers: {
              ...headers,
              'x-action': 'profile-upload',
              'x-profile-kind': 'avatar',
            },
            body: 'fake',
          }),
        )
      ).status,
    ).toBeGreaterThanOrEqual(400)
  expect(from).not.toHaveBeenCalled()
  await expect(
    profileMediaRequest(
      new Request('https://local.invalid', {
        method: 'POST',
        headers: { 'x-action': 'profile-upload', 'x-profile-kind': 'svg' },
        body: 'fake',
      }),
      admin,
      admin,
      id,
    ),
  ).rejects.toThrow()
  expect(from).not.toHaveBeenCalled()
})
