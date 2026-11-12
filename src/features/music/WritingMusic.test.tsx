import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { WritingMusic } from './WritingMusic'

vi.mock('./youtube', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./youtube')>()),
  youtubeMusicEnabled: true,
}))

const oldSelection = {
  provider: 'spotify',
  kind: 'track',
  id: '4uLU6hMCjMI75M1A2tKUQC',
} as const

it('hides legacy music on public stories', () => {
  const { container } = render(<WritingMusic value={oldSelection} publicCopy />)
  expect(container).toBeEmptyDOMElement()
})

it('rejects Spotify links and lets the writer remove a legacy attachment', async () => {
  const onChange = vi.fn()
  render(
    <WritingMusic
      value={{ ...oldSelection, share: true }}
      onChange={onChange}
    />,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Add music' }))
  await userEvent.type(
    screen.getByLabelText('YouTube link'),
    'https://open.spotify.com/track/' + oldSelection.id,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Attach music' }))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Paste a YouTube video link.',
  )
  expect(onChange).not.toHaveBeenCalled()
  await userEvent.click(
    screen.getByRole('button', { name: 'Remove old attachment' }),
  )
  expect(onChange).toHaveBeenCalledWith(null)
})
