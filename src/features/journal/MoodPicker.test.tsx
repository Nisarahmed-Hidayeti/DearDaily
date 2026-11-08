import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { MoodPicker } from './MoodPicker'
it('offers expanded moods without crowding the initial details panel', async () => {
  const change = vi.fn()
  render(<MoodPicker preview value="Calm" onChange={change} />)
  expect(screen.queryByRole('button', { name: 'Grateful' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'More moods' }))
  await userEvent.click(screen.getByRole('button', { name: 'Grateful' }))
  expect(change).toHaveBeenCalledWith('Grateful')
})
