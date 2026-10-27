import { describe, expect, it, vi } from 'vitest'
import { formatLocalDate, parseLocalDate } from './dates'

describe('visitor-local dates', () => {
  it('uses the browser locale and timezone without overriding either', () => {
    const date = new Date('2026-10-27T00:30:00Z')
    const expected = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'long',
    }).format(date)
    const formatter = vi.spyOn(Intl, 'DateTimeFormat')
    expect(formatLocalDate(date)).toBe(expected)
    expect(formatter).toHaveBeenCalledWith(undefined, { dateStyle: 'long' })
  })
  it('keeps a calendar date on its original local day', () => {
    const date = parseLocalDate('2026-10-27')
    expect([
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
    ]).toEqual([2026, 9, 27, 12])
  })
})
