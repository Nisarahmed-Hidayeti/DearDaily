import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, it, expect, vi } from 'vitest'
import WritingVisibilityControl from './WritingVisibilityControl'
import type { PublicProfile } from './communityApi'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ client: { rpc } }),
}))
const profile = {
  username: 'writer',
  display_name: 'Writer',
  bio: '',
  avatar: 'leaf',
  visible: true,
  joined_month: null,
} as PublicProfile
beforeEach(() => rpc.mockReset())
it('has no separate refresh option and confirms ongoing sharing before showing a streak', async () => {
  rpc.mockResolvedValue({
    data: { public_streak: 2, public_rhythm: null },
    error: null,
  })
  render(<WritingVisibilityControl saved initial={profile} />)
  expect(screen.queryByRole('checkbox', { name: /Automatic/ })).toBeNull()
  await userEvent.click(
    screen.getByRole('checkbox', { name: /Writing streak/ }),
  )
  expect(rpc).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog')).toHaveTextContent('update automatically')
  await userEvent.click(screen.getByRole('button', { name: 'Confirm sharing' }))
  expect(rpc).toHaveBeenCalledWith('set_public_writing_visibility', {
    show_streak: true,
    show_calendar: false,
    zone: expect.any(String),
  })
  expect(
    await screen.findByRole('checkbox', { name: /Writing streak/ }),
  ).toBeChecked()
  expect(screen.queryByRole('button', { name: /Refresh/ })).toBeNull()
})
it('retains hidden choices and does not claim failure succeeded', async () => {
  rpc.mockResolvedValue({ data: null, error: new Error('denied') })
  render(
    <WritingVisibilityControl
      saved
      initial={{ ...profile, public_streak: 3, public_activity_live: true }}
    />,
  )
  await userEvent.click(
    screen.getByRole('checkbox', { name: /Writing streak/ }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save')
  expect(screen.getByRole('checkbox', { name: /Writing streak/ })).toBeChecked()
})
it('requires one confirmation to upgrade existing snapshots rather than silently expanding disclosure', async () => {
  render(
    <WritingVisibilityControl
      saved
      initial={{ ...profile, public_streak: 2 }}
    />,
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirm updated sharing' }),
  )
  expect(rpc).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog')).toHaveTextContent('update automatically')
})
