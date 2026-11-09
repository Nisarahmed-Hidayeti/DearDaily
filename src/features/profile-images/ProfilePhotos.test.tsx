import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { ProfilePhotos } from './ProfilePhotos'
const mocks = vi.hoisted(() => ({
  client: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { cleaned: true, pending: 0 },
        error: null,
      }),
    },
  },
  own: vi.fn(),
  save: vi.fn(),
  upload: vi.fn(),
}))
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    client: mocks.client,
    session: { user: { id: 'account-a' } },
  }),
}))
vi.mock('./api', async (original) => ({
  ...(await original<typeof import('./api')>()),
  profileImagesEnabled: true,
  ownImages: mocks.own,
  saveImages: mocks.save,
  uploadProfileImage: mocks.upload,
}))
vi.mock('./ProfileImage', () => ({
  ProfileImage: ({
    fallback,
    asset,
  }: {
    fallback: React.ReactNode
    asset?: string
  }) => (
    <span data-testid="image-preview" data-asset={asset}>
      {fallback}
    </span>
  ),
}))
vi.mock('./ImageCropDialog', () => ({
  ImageCropDialog: ({
    onUse,
    onClose,
  }: {
    onUse: (b: Blob) => Promise<void>
    onClose: () => void
  }) => (
    <div role="dialog" aria-label="Crop fixture">
      <button
        onClick={() =>
          void onUse(new Blob(['prepared'], { type: 'image/webp' }))
        }
      >
        Use crop fixture
      </button>
      <button onClick={onClose}>Cancel crop</button>
    </div>
  ),
}))
const avatar = '95000000-0000-4000-8000-000000000001',
  banner = '95000000-0000-4000-8000-000000000002'
const empty = {
  avatar_asset: null,
  banner_asset: null,
  share_avatar: false,
  share_banner: false,
  banner_position: 50,
  version: 0,
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.own.mockResolvedValue(empty)
  mocks.upload.mockResolvedValue(avatar)
  mocks.save.mockImplementation(async (_c, v) => ({
    ...v,
    version: v.version + 1,
  }))
})
it('keeps a newly cropped photo private until deliberate sharing and backend-confirmed saving', async () => {
  const user = userEvent.setup()
  render(<ProfilePhotos fallback="☾" publicVisible />)
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeEnabled(),
  )
  await user.upload(
    screen.getByLabelText('Upload profile photo'),
    new File(['fixture'], 'photo.png', { type: 'image/png' }),
  )
  await user.click(screen.getByRole('button', { name: 'Use crop fixture' }))
  const consent = await screen.findByRole('checkbox', {
    name: /Show this photo/,
  })
  expect(consent).not.toBeChecked()
  expect(mocks.save).not.toHaveBeenCalled()
  await user.click(consent)
  await user.click(screen.getByRole('button', { name: 'Save photos' }))
  await screen.findByText('Photos saved.')
  expect(mocks.save.mock.calls[0][1]).toMatchObject({
    avatar_asset: avatar,
    share_avatar: true,
    banner_asset: null,
    version: 0,
  })
})
it('cannot share private photos while the public profile is hidden', async () => {
  mocks.own.mockResolvedValue({ ...empty, avatar_asset: avatar })
  const user = userEvent.setup()
  render(<ProfilePhotos fallback="❧" publicVisible={false} />)
  expect(
    await screen.findByRole('checkbox', { name: /Show this photo/ }),
  ).toBeDisabled()
  await user.click(
    screen.getByRole('button', { name: 'Remove photo · use icon' }),
  )
  await user.click(screen.getByRole('button', { name: 'Save photos' }))
  await screen.findByText('Photos saved.')
  expect(mocks.save.mock.calls[0][1]).toMatchObject({
    avatar_asset: null,
    share_avatar: false,
  })
})
it('routes a dropped banner through cropping and leaves it private before saving', async () => {
  mocks.upload.mockResolvedValue(banner)
  const user = userEvent.setup()
  const { container } = render(<ProfilePhotos fallback="☾" publicVisible />)
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Add banner' })).toBeEnabled(),
  )
  fireEvent.drop(container.querySelector('.profile-banner-editor')!, {
    dataTransfer: {
      files: [new File(['fixture'], 'banner.jpg', { type: 'image/jpeg' })],
    },
  })
  await user.click(
    await screen.findByRole('button', { name: 'Use crop fixture' }),
  )
  expect(mocks.upload).toHaveBeenCalledWith(
    mocks.client,
    'banner',
    expect.any(Blob),
  )
  expect(
    await screen.findByRole('checkbox', {
      name: 'Show this banner on my public profile',
    }),
  ).not.toBeChecked()
  expect(mocks.save).not.toHaveBeenCalled()
})
it('persists banner positioning and restores a preset without deleting journal content', async () => {
  mocks.own.mockResolvedValue({ ...empty, banner_asset: banner, version: 4 })
  const user = userEvent.setup()
  render(
    <ProfilePhotos
      fallback="☾"
      preset="/covers/forest-light.jpg"
      publicVisible
    />,
  )
  const position = await screen.findByRole('slider', {
    name: 'Banner position',
  })
  fireEvent.change(position, { target: { value: '75' } })
  await user.click(screen.getByRole('button', { name: 'Save photos' }))
  await screen.findByText('Photos saved.')
  expect(mocks.save.mock.calls[0][1].banner_position).not.toBe(50)
  await user.click(screen.getByRole('button', { name: 'Restore preset' }))
  await user.click(screen.getByRole('button', { name: 'Save photos' }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2))
  expect(mocks.save.mock.calls[1][1]).toMatchObject({
    banner_asset: null,
    share_banner: false,
  })
})
it('does not claim success on a failed save and retains changes for explicit reconciliation', async () => {
  mocks.own.mockResolvedValue({ ...empty, avatar_asset: avatar })
  mocks.save.mockRejectedValue(Error('Reload before retrying.'))
  const user = userEvent.setup()
  render(<ProfilePhotos fallback="☾" publicVisible />)
  await user.click(
    await screen.findByRole('checkbox', { name: /Show this photo/ }),
  )
  await user.click(screen.getByRole('button', { name: 'Save photos' }))
  await screen.findByText('Reload before retrying.')
  expect(screen.queryByText('Photos saved.')).toBeNull()
  expect(
    screen.getByRole('checkbox', { name: /Show this photo/ }),
  ).toBeChecked()
})
