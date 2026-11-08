import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OwnerAdmin, { OwnerControlsLink } from './OwnerAdmin'
const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  listFactors: vi.fn(),
  challengeAndVerify: vi.fn(),
  enroll: vi.fn(),
}))
vi.mock('./config', () => ({ ownerControlsEnabled: true }))
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    client: testClient,
    session: { user: { email: 'nisarahmedhidayeti@gmail.com' } },
  }),
}))
const testClient = {
  rpc: state.rpc,
  auth: {
    mfa: {
      listFactors: state.listFactors,
      challengeAndVerify: state.challengeAndVerify,
      enroll: state.enroll,
    },
  },
}
function mount() {
  return render(
    <MemoryRouter>
      <OwnerAdmin />
    </MemoryRouter>,
  )
}
describe('backend owner authorization and MFA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('does not infer ownership from the account email or show controls to ordinary users', async () => {
    state.rpc.mockResolvedValue({
      data: { owner: false, mfa: true },
      error: null,
    })
    mount()
    expect(
      await screen.findByText('Restricted to the backend-verified owner.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Remove story')).not.toBeInTheDocument()
    expect(state.listFactors).not.toHaveBeenCalled()
    expect(state.rpc).toHaveBeenCalledTimes(1)
  })
  it('hides the account menu link unless the backend confirms ownership', async () => {
    state.rpc.mockResolvedValue({
      data: { owner: false, mfa: false },
      error: null,
    })
    render(
      <MemoryRouter>
        <OwnerControlsLink />
      </MemoryRouter>,
    )
    await waitFor(() => expect(state.rpc).toHaveBeenCalled())
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
  it('requires successful authenticator verification before loading owner content', async () => {
    state.rpc.mockResolvedValue({
      data: { owner: true, mfa: false },
      error: null,
    })
    state.listFactors.mockResolvedValue({
      data: { totp: [{ id: 'synthetic-factor' }] },
      error: null,
    })
    state.challengeAndVerify.mockResolvedValue({
      error: new Error('synthetic rejection'),
    })
    mount()
    const input = await screen.findByRole('textbox', {
      name: 'Authenticator code',
    })
    await userEvent.type(input, '000000')
    await userEvent.click(
      screen.getByRole('button', { name: 'Verify owner session' }),
    )
    expect(
      await screen.findByText(/Authenticator verification failed/),
    ).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(state.rpc.mock.calls.map((c) => c[0])).not.toContain(
      'owner_public_stories',
    )
    expect(state.enroll).not.toHaveBeenCalled()
  })
  it('never removes a story optimistically when the backend rejects a confirmed decision', async () => {
    state.rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'my_owner_access'
          ? { data: { owner: true, mfa: true }, error: null }
          : name === 'owner_public_stories'
            ? {
                data: [
                  {
                    id: 'synthetic-story',
                    title: 'Synthetic public story',
                    public_username: null,
                    published_at: '2026-11-08T00:00:00Z',
                  },
                ],
                error: null,
              }
            : name === 'owner_publishing_bans'
              ? { data: [], error: null }
              : { error: new Error('synthetic rejection') },
      ),
    )
    mount()
    await screen.findByText('Synthetic public story')
    await userEvent.click(screen.getByRole('button', { name: 'Remove story' }))
    expect(state.rpc.mock.calls.map((c) => c[0])).not.toContain(
      'owner_moderate_story',
    )
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Reason' }),
      'Synthetic reason',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm decision' }),
    )
    expect(
      await screen.findByText(/Decision was not confirmed/),
    ).toBeInTheDocument()
    expect(screen.getByText('Synthetic public story')).toBeInTheDocument()
    expect(state.rpc).toHaveBeenCalledWith('owner_moderate_story', {
      story: 'synthetic-story',
      ban_author: false,
      reason: 'Synthetic reason',
    })
  })
})
