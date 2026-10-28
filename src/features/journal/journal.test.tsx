import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useJournalEntry } from './useJournalEntry'
import { journalStats } from './journalStats'
import { newDraft, saveEntry } from './journalApi'
import type { JournalEntry } from './journalApi'
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ client: {}, session: { user: { id: 'test-owner' } } }),
}))
vi.mock('./journalApi', async (original) => ({
  ...(await original<typeof import('./journalApi')>()),
  saveEntry: vi.fn(),
  readStories: vi.fn().mockResolvedValue([]),
}))
afterEach(() => vi.useRealTimers())
function row(body = 'first', version = 1): JournalEntry {
  return {
    ...newDraft(),
    id: 'entry-id',
    user_id: 'test-owner',
    title: 'Title',
    body,
    version,
    created_at: '2026-10-28T10:00:00Z',
    updated_at: '2026-10-28T10:00:00Z',
  }
}
describe('journal save lifecycle', () => {
  it('debounces writes, preserves edits during a request and uses the confirmed version next', async () => {
    vi.useFakeTimers()
    let finish!: (entry: JournalEntry) => void
    vi.mocked(saveEntry)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
      .mockResolvedValueOnce(row('newer', 2))
    const { result } = renderHook(() => useJournalEntry())
    await act(async () => {
      result.current.setDraft({ ...newDraft(), title: 'Title', body: 'first' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1199)
    })
    expect(saveEntry).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(result.current.busy).toBe(true)
    await act(async () => {
      result.current.setDraft({ ...newDraft(), title: 'Title', body: 'newer' })
      finish({ ...row(), id: result.current.id })
    })
    expect(result.current.draft.body).toBe('newer')
    expect(result.current.dirty).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })
    expect(saveEntry).toHaveBeenLastCalledWith(
      {},
      'test-owner',
      result.current.id,
      expect.objectContaining({ body: 'newer' }),
      1,
    )
    expect(result.current.error).toBe('')
    expect(result.current.dirty).toBe(false)
  })
  it('never claims a failed save succeeded and stops automatic retries', async () => {
    vi.useFakeTimers()
    vi.mocked(saveEntry).mockRejectedValueOnce(new Error('network'))
    const { result } = renderHook(() => useJournalEntry())
    await act(async () => {
      result.current.setDraft({
        ...newDraft(),
        body: 'Keep these private words',
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })
    expect(result.current.draft.body).toBe('Keep these private words')
    expect(result.current.error).toContain('Save not confirmed')
    expect(result.current.row).toBeNull()
    const calls = vi.mocked(saveEntry).mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(saveEntry).toHaveBeenCalledTimes(calls)
  })
  it('does not overwrite after a conflict until the writer explicitly retries', async () => {
    vi.useFakeTimers()
    vi.mocked(saveEntry).mockRejectedValueOnce(new Error('conflict'))
    const { result } = renderHook(() => useJournalEntry())
    await act(async () => {
      result.current.setDraft({ ...newDraft(), body: 'draft' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })
    expect(result.current.dirty).toBe(true)
    expect(result.current.error).toContain('reconcile a conflict')
  })
})
describe('honest journal statistics', () => {
  it('counts saved dates once and ignores drafts/future days for the current streak', () => {
    const rows = [
      { ...row(), entry_date: '2026-10-28', status: 'saved' },
      { ...row(), entry_date: '2026-10-28', status: 'saved' },
      { ...row(), entry_date: '2026-10-27', status: 'saved' },
      { ...row(), entry_date: '2026-10-26', status: 'draft' },
      { ...row(), entry_date: '2026-11-01', status: 'saved' },
    ] as JournalEntry[]
    const stats = journalStats(rows, new Date(2026, 9, 28, 12))
    expect(stats.streak).toBe(2)
    expect(stats.activity.find((d) => d.date === '2026-10-28')?.minutes).toBe(2)
    expect(journalStats([], new Date(2026, 9, 28, 12)).streak).toBe(0)
  })
})

describe('public export privacy boundary', () => {
  it('escapes executable markup and includes no private metadata', async () => {
    const { publicStoryHtml } = await import('./publicExport')
    const html = publicStoryHtml(
      'A <title>',
      '<script>alert("x")</script>\nMy selected story',
    )
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain("default-src 'none'")
    expect(html).not.toContain('user_id')
    expect(html).not.toContain('entry_date')
  })
})
