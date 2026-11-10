import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import PublicRhythmControl from './PublicRhythmControl'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ client: { rpc } }),
}))
vi.mock('./publicRhythm', async (original) => ({
  ...(await original<typeof import('./publicRhythm')>()),
  publicRhythmEnabled: true,
}))
beforeEach(() => rpc.mockReset())
it('shares individual dates only after separate explicit confirmation and backend success', async () => {
  rpc.mockResolvedValue({
    data: { start: '2026-11-02', days: ['2026-11-03'] },
    error: null,
  })
  render(<PublicRhythmControl saved />)
  await userEvent.click(
    screen.getByRole('button', { name: 'Share writing calendar' }),
  )
  expect(rpc).not.toHaveBeenCalled()
  expect(
    screen.getByText(/individual days you saved private journal entries/),
  ).toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: 'Share my writing dates' }),
  )
  expect(await screen.findByText('Calendar snapshot shared.')).toBeVisible()
  expect(rpc).toHaveBeenCalledWith('set_public_rhythm', {
    enabled: true,
    today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  })
  rpc.mockResolvedValue({ data: null, error: null })
  await userEvent.click(
    screen.getByRole('button', { name: 'Hide writing calendar' }),
  )
  expect(await screen.findByText('Calendar hidden.')).toBeVisible()
})
it('does not claim hiding succeeded on backend error', async () => {
  rpc.mockResolvedValue({ data: null, error: new Error('denied') })
  render(
    <PublicRhythmControl saved initial={{ start: '2026-11-02', days: [] }} />,
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Hide writing calendar' }),
  )
  await waitFor(() =>
    expect(
      screen.getByText('Calendar choice could not be confirmed. Try again.'),
    ).toBeVisible(),
  )
  expect(
    screen.getByRole('button', { name: 'Hide writing calendar' }),
  ).toBeVisible()
})
it('keeps a failed sharing request visible inside its confirmation', async () => {
  rpc.mockResolvedValue({ data: null, error: new Error('offline') })
  render(<PublicRhythmControl saved />)
  await userEvent.click(
    screen.getByRole('button', { name: 'Share writing calendar' }),
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Share my writing dates' }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Calendar choice could not be confirmed.',
  )
  expect(screen.getByRole('dialog')).toContainElement(screen.getByRole('alert'))
  expect(screen.queryByText('Calendar snapshot shared.')).toBeNull()
})
