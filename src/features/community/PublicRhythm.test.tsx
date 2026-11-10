import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { PublicRhythm } from './PublicProfile'
vi.mock('./publicRhythm', async (original) => ({
  ...(await original<typeof import('./publicRhythm')>()),
  publicRhythmEnabled: true,
}))
vi.mock('./publicStreakConfig', () => ({ publicStreaksEnabled: true }))
it('shows only explicitly shared count snapshots, without inventing private daily activity', () => {
  const { rerender } = render(<PublicRhythm count={null} />)
  expect(screen.queryByLabelText('Shared writing rhythm')).toBeNull()
  rerender(<PublicRhythm count={2} />)
  expect(screen.getByLabelText('Shared writing rhythm')).toHaveTextContent(
    '2days',
  )
  expect(screen.getByText('Shared streak snapshot')).toBeVisible()
  expect(document.querySelector('time')).toBeNull()
  expect(screen.queryByRole('grid')).toBeNull()
  rerender(<PublicRhythm count={0} />)
  expect(screen.getByText('0')).toBeVisible()
  rerender(<PublicRhythm count={-1} />)
  expect(screen.queryByLabelText('Shared writing rhythm')).toBeNull()
})

it('uses the author name and compact home-page calendar only for consented date snapshots', () => {
  render(
    <PublicRhythm
      count={2}
      name="Ahmed hidayeti"
      snapshot={{ start: '2026-11-02', days: ['2026-11-03'] }}
    />,
  )
  expect(
    screen.getByRole('heading', { name: 'Ahmed’s writing rhythm' }),
  ).toBeVisible()
  expect(screen.getAllByRole('img')).toHaveLength(84)
  expect(
    screen.getByRole('img', {
      name: /Tuesday, November 3, 2026: shared writing day/,
    }),
  ).toHaveAttribute('data-level', '4')
  expect(screen.queryByText('One checkmark for showing up.')).toBeNull()
  expect(document.querySelector('.activity-compact')).not.toHaveClass('panel')
})
