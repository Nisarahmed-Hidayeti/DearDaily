import { expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createVoiceHandler } from '../../../supabase/functions/_shared/voiceHandler'
const id = '81000000-0000-4000-8000-000000000001',
  who = '82000000-0000-4000-8000-000000000001'
const post = (body: object, headers: Record<string, string> = {}) =>
  new Request('http://local/functions/v1/voice-gateway', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
it('rejects missing/invalid sessions and foreign origins before privileged reads', async () => {
  const rpc = vi.fn(),
    user = vi.fn(
      () =>
        ({
          auth: {
            getUser: async () => ({
              data: { user: null },
              error: Error('Invalid'),
            }),
          },
        }) as unknown as SupabaseClient,
    )
  const handler = createVoiceHandler(
    { rpc } as unknown as SupabaseClient,
    user,
    ['http://localhost:5173'],
  )
  expect((await handler(post({ action: 'read', id }))).status).toBe(401)
  expect(
    (
      await handler(
        post({ action: 'read', id }, { Authorization: 'Bearer invalid' }),
      )
    ).status,
  ).toBe(401)
  expect(
    (
      await handler(
        post(
          { action: 'read', id },
          { Origin: 'https://evil.test', Authorization: 'Bearer invalid' },
        ),
      )
    ).status,
  ).toBe(403)
  expect(rpc).not.toHaveBeenCalled()
})
it('does not sign another user’s private audio even with a genuine session', async () => {
  const signed = vi.fn(),
    rpc = vi.fn(async () => ({
      data: { id, user_id: 'someone-else', ready: true },
      error: null,
    }))
  const handler = createVoiceHandler(
    {
      rpc,
      storage: { from: () => ({ createSignedUrl: signed }) },
    } as unknown as SupabaseClient,
    () =>
      ({
        auth: {
          getUser: async () => ({ data: { user: { id: who } }, error: null }),
        },
      }) as unknown as SupabaseClient,
    [],
  )
  expect(
    (
      await handler(
        post({ action: 'read', id }, { Authorization: 'Bearer valid' }),
      )
    ).status,
  ).toBe(404)
  expect(signed).not.toHaveBeenCalled()
})
it('checks a currently published snapshot before issuing any public URL', async () => {
  const signed = vi.fn(),
    rpc = vi.fn(async () => ({ data: { entry_id: id }, error: null }))
  const maybeSingle = vi.fn(async () => ({
    data: { voice_notes: [] },
    error: null,
  }))
  const handler = createVoiceHandler(
    {
      rpc,
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
      storage: { from: () => ({ createSignedUrl: signed }) },
    } as unknown as SupabaseClient,
    vi.fn(),
    [],
  )
  expect(
    (
      await handler(
        new Request('http://local/functions/v1/voice-gateway?public=' + id),
      )
    ).status,
  ).toBe(404)
  expect(signed).not.toHaveBeenCalled()
})
