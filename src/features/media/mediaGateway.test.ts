import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createMediaHandler,
  mediaRefs,
  publicDocument,
} from '../../../supabase/functions/_shared/mediaHandler'
const a = '81000000-0000-4000-8000-000000000001'
const b = '82000000-0000-4000-8000-000000000001'
describe('media gateway public/private boundary', () => {
  it('creates independent public references without changing private source data', () => {
    const source = {
      version: 1,
      page: { cover: 'upload', assetId: a, position: 30 },
      content: {
        type: 'doc',
        content: [
          { type: 'journalImage', attrs: { assetId: a, alt: 'Approved alt' } },
        ],
      },
    }
    const published = publicDocument(source, new Map([[a, b]]))
    expect(mediaRefs(source)).toEqual([a])
    expect(mediaRefs(published, true)).toEqual([b])
    expect(JSON.stringify(published)).not.toContain(a)
    expect(source.page.assetId).toBe(a)
    expect(() => publicDocument(source, new Map())).toThrow()
  })
  it('rejects invalid and excessive media references', () => {
    expect(() =>
      mediaRefs({
        content: { type: 'journalImage', attrs: { assetId: '../private' } },
      }),
    ).toThrow()
    expect(() =>
      mediaRefs({
        content: {
          type: 'doc',
          content: Array.from({ length: 11 }, (_, i) => ({
            type: 'journalImage',
            attrs: {
              assetId: `81000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
            },
          })),
        },
      }),
    ).toThrow()
  })
  it('validates authentication and origin before any privileged data access', async () => {
    const database = vi.fn(() => {
      throw Error('Unexpected privileged access')
    })
    const userClient = vi.fn(
      () =>
        ({
          auth: {
            getUser: async () => ({
              data: { user: null },
              error: { message: 'Invalid' },
            }),
          },
        }) as unknown as SupabaseClient,
    )
    const handler = createMediaHandler(
      { from: database } as unknown as SupabaseClient,
      userClient,
      ['http://localhost:5173'],
    )
    const post = (headers: Record<string, string>) =>
      handler(
        new Request('http://localhost/functions/v1/media-gateway', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'read', id: a }),
        }),
      )
    expect((await post({})).status).toBe(401)
    expect((await post({ Authorization: 'Bearer invalid' })).status).toBe(401)
    expect(
      (
        await post({
          Origin: 'https://untrusted.invalid',
          Authorization: 'Bearer invalid',
        })
      ).status,
    ).toBe(403)
    expect(database).not.toHaveBeenCalled()
    expect(userClient).toHaveBeenCalledTimes(1)
  })
})
