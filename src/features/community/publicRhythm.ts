import { parseLocalDate } from '../../lib/dates'
import type { ActivityDay } from '../../data/demo'
export const publicRhythmEnabled =
  import.meta.env.VITE_ENABLE_PUBLIC_RHYTHM === 'true'
export interface RhythmSnapshot {
  start: string
  days: string[]
}
export function rhythmActivity(value: unknown): ActivityDay[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const p = value as RhythmSnapshot
  const validDate = (date: unknown): date is string => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return false
    const d = parseLocalDate(date)
    return (
      !isNaN(d.getTime()) &&
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` ===
        date
    )
  }
  if (
    Object.keys(p).some((k) => !['start', 'days'].includes(k)) ||
    !validDate(p.start) ||
    parseLocalDate(p.start).getDay() !== 1 ||
    !Array.isArray(p.days) ||
    p.days.length > 84 ||
    p.days.some((d) => !validDate(d)) ||
    new Set(p.days).size !== p.days.length
  )
    return null
  const dates = Array.from({ length: 84 }, (_, i) => {
    const date = parseLocalDate(p.start)
    date.setDate(date.getDate() + i)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })
  if (p.days.some((d) => !dates.includes(d))) return null
  return dates.map((date) => ({
    date,
    minutes: p.days.includes(date) ? 1 : 0,
    level: p.days.includes(date) ? 4 : 0,
  }))
}
