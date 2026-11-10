import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import CloudEditor from './CloudEditor'
import { newDraft } from './journalApi'
const mock = vi.hoisted(() => ({ setDraft: vi.fn(), action: vi.fn() }))
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ client: null, session: null }),
}))
vi.mock('../music/music', async (original) => ({
  ...(await original<typeof import('../music/music')>()),
  persistentMusicEnabled: true,
}))
vi.mock('./useJournalEntry', () => ({
  useJournalEntry: () => {
    const row = {
      ...newDraft(),
      id: 'synthetic',
      user_id: 'A',
      title: 'Synthetic music',
      body: 'Synthetic writing',
      version: 1,
      music: {
        provider: 'youtube',
        kind: 'video',
        id: 'M7lc1UVf-VE',
        share: false,
      },
    }
    return {
      row,
      draft: row,
      setDraft: mock.setDraft,
      ready: true,
      busy: false,
      error: '',
      dirty: false,
      published: false,
      publicMetadata: null,
      action: mock.action,
      save: vi.fn(),
    }
  },
}))
it('exposes music consent in the final publish review without publishing automatically', async () => {
  render(
    <MemoryRouter>
      <CloudEditor />
    </MemoryRouter>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Publish story' }))
  const choice = screen.getByRole('checkbox', { name: 'Include this music' })
  expect(choice).not.toBeChecked()
  await userEvent.click(choice)
  const update = mock.setDraft.mock.calls.at(-1)![0]
  expect(
    update({
      music: {
        provider: 'youtube',
        kind: 'video',
        id: 'M7lc1UVf-VE',
        share: false,
      },
    }).music.share,
  ).toBe(true)
  expect(mock.action).not.toHaveBeenCalled()
})
