import { expect, it } from 'vitest'
import { rhythmActivity } from './publicRhythm'
it('builds only the approved 84-day snapshot with uniform checkmarks and no entry counts', () => {
  const activity = rhythmActivity({
    start: '2026-11-02',
    days: ['2026-11-03', '2026-11-05'],
  })!
  expect(activity).toHaveLength(84)
  expect(activity.filter((d) => d.minutes)).toEqual([
    { date: '2026-11-03', minutes: 1, level: 4 },
    { date: '2026-11-05', minutes: 1, level: 4 },
  ])
})
it('rejects malformed, invented-range, duplicate and additional private data', () => {
  for (const value of [
    null,
    [],
    { start: '2026-11-03', days: [] },
    { start: '2026-11-02', days: ['2026-02-30'] },
    { start: '2026-11-02', days: ['2025-01-01'] },
    { start: '2026-11-02', days: ['2026-11-03', '2026-11-03'] },
    { start: '2026-11-02', days: [], private: 'secret' },
  ])
    expect(rhythmActivity(value)).toBeNull()
})
