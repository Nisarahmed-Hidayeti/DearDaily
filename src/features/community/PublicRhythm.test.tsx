import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { PublicRhythm } from './PublicProfile'
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
