import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import ActivityHeatmap from './ActivityHeatmap'
import { sampleActivity } from '../../data/demo'
import { parseLocalDate } from '../../lib/dates'

describe('dated activity calendar', () => {
  it.each([
    [
      [0, 1, 0, 0, 0, 0, 0],
      [0, 4, 0, 0, 0, 0, 0],
    ],
    [
      [0, 1, 2, 3, 4, 8, 8],
      [0, 1, 1, 2, 2, 4, 4],
    ],
    [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ],
  ])(
    'scales saved entries to each writer’s visible maximum: %j',
    (counts, levels) => {
      render(
        <ActivityHeatmap
          real
          activity={sampleActivity
            .slice(0, 7)
            .map((day, i) => ({ ...day, minutes: counts[i], level: 0 }))}
        />,
      )
      expect(
        screen
          .getAllByRole('img')
          .map((cell) => Number(cell.getAttribute('data-level'))),
      ).toEqual(levels)
    },
  )
  it('orders twelve Monday-to-Sunday weeks with exactly seven cells per week', () => {
    render(<ActivityHeatmap />)
    const weeks = screen.getAllByRole('listitem')
    expect(weeks).toHaveLength(12)
    const dates: string[] = []
    weeks.forEach((week) => {
      const days = within(week).getAllByRole('img')
      expect(days).toHaveLength(7)
      expect(parseLocalDate(days[0].getAttribute('data-date')!).getDay()).toBe(
        1,
      )
      expect(parseLocalDate(days[6].getAttribute('data-date')!).getDay()).toBe(
        0,
      )
      days.forEach((day) => dates.push(day.getAttribute('data-date')!))
    })
    expect(dates).toEqual(sampleActivity.map((day) => day.date))
    expect(dates[0]).toBe('2026-08-03')
    expect(dates.at(-1)).toBe('2026-10-25')
    expect(new Set(dates).size).toBe(84)
  })

  it('provides labels, keyboard scrolling, and a dated description for every cell', () => {
    render(<ActivityHeatmap />)
    expect(
      screen.getByRole('region', { name: 'Writing activity calendar' }),
    ).toHaveAttribute('tabindex', '0')
    const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' })
    sampleActivity.forEach((day) => {
      const text = `${formatter.format(parseLocalDate(day.date))}: ${day.minutes ? `${day.minutes} minutes written` : 'no writing'} (sample)`
      expect(screen.getByRole('img', { name: text })).toHaveAttribute(
        'title',
        text,
      )
    })
    const monthFormatter = new Intl.DateTimeFormat(undefined, {
      month: 'short',
    })
    for (const date of ['2026-08-03', '2026-09-01', '2026-10-01']) {
      expect(
        screen.getByText(monthFormatter.format(parseLocalDate(date))),
      ).toBeInTheDocument()
    }
  })
})
