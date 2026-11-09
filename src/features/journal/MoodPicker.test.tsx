import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { MoodPicker } from './MoodPicker'
it('shows all moods immediately in a uniform scrollable grid', async () => {
  const change = vi.fn()
  render(<MoodPicker preview value="Calm" onChange={change} />)
  expect(screen.getByRole('button', { name: 'Grateful' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'More moods' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Grateful' }))
  expect(change).toHaveBeenCalledWith('Grateful')
})
