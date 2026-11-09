import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ProfileImage } from './ProfileImage'
const state = vi.hoisted(() => ({
  who: 'account-a',
  client: {},
  read: vi.fn(),
}))
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    client: state.client,
    session: { user: { id: state.who } },
  }),
}))
vi.mock('./api', async (original) => ({
  ...(await original<typeof import('./api')>()),
  profileImagesEnabled: true,
  privateProfileImage: state.read,
}))
it('never displays another account’s resolved private photo during account switching', async () => {
  state.who = 'account-a'
  state.read.mockResolvedValue('https://example.invalid/signed-a')
  const { rerender } = render(
    <ProfileImage
      asset="95000000-0000-4000-8000-000000000001"
      fallback="☾"
      alt="Private avatar"
    />,
  )
  const image = await screen.findByRole('img', { name: 'Private avatar' })
  fireEvent.load(image)
  expect(image).toHaveAttribute('src', 'https://example.invalid/signed-a')
  state.who = 'account-b'
  state.read.mockImplementation(() => new Promise(() => {}))
  rerender(
    <ProfileImage
      asset="95000000-0000-4000-8000-000000000001"
      fallback="❧"
      alt="Private avatar"
    />,
  )
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByText('❧')).toBeVisible()
})
it('keeps a fallback while loading and removes a broken image', async () => {
  state.who = 'account-a'
  state.read.mockResolvedValue('https://example.invalid/signed-b')
  render(
    <ProfileImage
      asset="95000000-0000-4000-8000-000000000002"
      fallback="☾"
      alt="Avatar"
    />,
  )
  const image = await screen.findByRole('img', { name: 'Avatar' })
  expect(image.style.opacity).toBe('0')
  fireEvent.error(image)
  await waitFor(() => expect(screen.queryByRole('img')).toBeNull())
  expect(screen.getByText('☾')).toBeVisible()
})
