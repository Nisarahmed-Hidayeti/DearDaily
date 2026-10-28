import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadCloudTheme, saveCloudTheme } from './cloudTheme'
function fakeDatabase() {
  const maybeSingle = vi.fn()
  const single = vi.fn()
  const insert = vi.fn().mockResolvedValue({ error: null })
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    update: vi.fn(),
    maybeSingle,
    single,
    insert,
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.update.mockReturnValue(query)
  const client = {
    from: vi.fn().mockReturnValue(query),
  } as unknown as SupabaseClient
  return { client, query, maybeSingle, single, insert }
}
describe('cloud theme data boundary', () => {
  it('loads an existing cloud choice without overwriting it with the guest choice', async () => {
    const db = fakeDatabase()
    db.maybeSingle.mockResolvedValue({
      data: { theme_id: 'paper-white' },
      error: null,
    })
    expect(await loadCloudTheme(db.client, 'user-a', 'midnight-purple')).toBe(
      'paper-white',
    )
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.query.eq).toHaveBeenCalledWith('user_id', 'user-a')
  })
  it('initializes missing data with an RLS-validated identity precondition', async () => {
    const db = fakeDatabase()
    db.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { theme_id: 'forest-green' },
        error: null,
      })
    expect(await loadCloudTheme(db.client, 'user-a', 'forest-green')).toBe(
      'forest-green',
    )
    expect(db.insert).toHaveBeenCalledWith({
      user_id: 'user-a',
      theme_id: 'forest-green',
    })
  })
  it('rereads a concurrent insert rather than overwriting it', async () => {
    const db = fakeDatabase()
    db.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { theme_id: 'paper-white' }, error: null })
    db.insert.mockResolvedValue({ error: { code: '23505' } })
    expect(await loadCloudTheme(db.client, 'user-a', 'forest-green')).toBe(
      'paper-white',
    )
    expect(db.query.update).not.toHaveBeenCalled()
  })
  it('does not initialize when reads fail', async () => {
    const db = fakeDatabase()
    db.maybeSingle.mockResolvedValue({
      data: null,
      error: new Error('offline'),
    })
    await expect(
      loadCloudTheme(db.client, 'user-a', 'forest-green'),
    ).rejects.toThrow()
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('does not report a zero-row update as saved', async () => {
    const db = fakeDatabase()
    db.single.mockResolvedValue({ data: null, error: null })
    await expect(
      saveCloudTheme(db.client, 'user-a', 'forest-green'),
    ).rejects.toThrow()
  })
  it('updates only theme, verifying the returned row', async () => {
    const db = fakeDatabase()
    db.single.mockResolvedValue({
      data: { theme_id: 'forest-green' },
      error: null,
    })
    await expect(
      saveCloudTheme(db.client, 'user-a', 'forest-green'),
    ).resolves.toBeUndefined()
    expect(db.query.update).toHaveBeenCalledWith({ theme_id: 'forest-green' })
  })
})
