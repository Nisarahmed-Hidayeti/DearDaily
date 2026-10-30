import { beforeEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadEntryPhoto } from './entryPhotoUpload'
import { uploadPhoto } from '../media/mediaApi'
import type { JournalEntry } from './journalApi'
vi.mock('../media/mediaApi', () => ({
  mediaEnabled: true,
  uploadPhoto: vi.fn(),
}))
const client = {} as SupabaseClient
function file(valid = true) {
  const header = valid
    ? [255, 216, 255, 224, 0, 0, 0, 0, 0, 0, 0, 0]
    : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  return {
    name: 'synthetic.jpg',
    type: 'image/jpeg',
    size: 12,
    slice: () => ({ arrayBuffer: async () => new Uint8Array(header).buffer }),
  } as unknown as File
}
beforeEach(() => {
  vi.mocked(uploadPhoto).mockReset()
})
it('creates one confirmed private draft before uploading from a new page', async () => {
  const save = vi.fn(async () => ({ id: 'private-fixture' }) as JournalEntry)
  vi.mocked(uploadPhoto).mockImplementation(async (_c, id) => {
    expect(save).toHaveBeenCalledOnce()
    expect(id).toBe('private-fixture')
    return 'asset'
  })
  expect(await uploadEntryPhoto(client, file(), 0, null, save)).toBe('asset')
})
it('does not create a row for an unsafe file and never uploads after an unconfirmed save', async () => {
  const save = vi.fn(async () => undefined)
  await expect(
    uploadEntryPhoto(client, file(false), 0, null, save),
  ).rejects.toThrow()
  expect(save).not.toHaveBeenCalled()
  await expect(uploadEntryPhoto(client, file(), 0, null, save)).rejects.toThrow(
    'not confirmed',
  )
  expect(uploadPhoto).not.toHaveBeenCalled()
})
it('reuses the existing private entry without creating another draft', async () => {
  const save = vi.fn(),
    row = { id: 'existing-private' } as JournalEntry
  vi.mocked(uploadPhoto).mockResolvedValue('asset')
  await uploadEntryPhoto(client, file(), 1, row, save)
  expect(save).not.toHaveBeenCalled()
  expect(uploadPhoto).toHaveBeenCalledWith(
    client,
    'existing-private',
    expect.anything(),
    1,
  )
})
