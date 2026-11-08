import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useJournalEntry } from './useJournalEntry'
import { saveEntry, type JournalEntry } from './journalApi'
const client = {}
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ client, session: { user: { id: 'synthetic' } } }),
}))
vi.mock('./journalApi', async (original) => ({
  ...(await original<typeof import('./journalApi')>()),
  saveEntry: vi.fn(),
}))
it('shares one in-flight save with an upload instead of reporting an unconfirmed draft', async () => {
  let confirm!: (row: JournalEntry) => void
  vi.mocked(saveEntry).mockImplementation(
    () =>
      new Promise((resolve) => {
        confirm = resolve
      }),
  )
  const { result } = renderHook(() => useJournalEntry())
  let first!: Promise<JournalEntry | undefined>,
    second!: Promise<JournalEntry | undefined>
  act(() => {
    first = result.current.save()
    second = result.current.save()
  })
  expect(first).toBe(second)
  expect(saveEntry).toHaveBeenCalledOnce()
  await act(async () => {
    confirm({
      ...result.current.draft,
      id: result.current.id,
      user_id: 'synthetic',
      version: 1,
      created_at: 'now',
      updated_at: 'now',
    })
    await first
  })
  expect(result.current.row?.id).toBe(result.current.id)
})
