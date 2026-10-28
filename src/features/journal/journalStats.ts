import type { ActivityDay } from '../../data/demo'
import { localDay } from './journalApi'
import type { JournalEntry } from './journalApi'
export function journalStats(rows: JournalEntry[], today = new Date()) {
  const days = new Set(
    rows.filter((r) => r.status === 'saved').map((r) => r.entry_date),
  )
  const cursor = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
  )
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(localDay(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
  )
  end.setDate(end.getDate() + ((7 - end.getDay()) % 7))
  const activity: ActivityDay[] = Array.from({ length: 84 }, (_, i) => {
    const date = new Date(end)
    date.setDate(end.getDate() - 83 + i)
    const key = localDay(date)
    const count = rows.filter(
      (r) => r.status === 'saved' && r.entry_date === key,
    ).length
    return { date: key, minutes: count, level: Math.min(4, count) }
  })
  return {
    streak,
    words: rows.reduce(
      (n, r) => n + (r.body.trim() ? r.body.trim().split(/\s+/).length : 0),
      0,
    ),
    activity,
  }
}
