import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CloudEditor from './CloudEditor'
import { publishStory, saveEntry, unpublishStory } from './journalApi'
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ client: {}, session: { user: { id: 'writer-a' } } }),
}))
vi.mock('./journalApi', async (original) => ({
  ...(await original<typeof import('./journalApi')>()),
  saveEntry: vi.fn(),
  publishStory: vi.fn(),
  unpublishStory: vi.fn(),
  readStories: vi.fn().mockResolvedValue([]),
}))
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(saveEntry).mockImplementation(async (_client, user, id, draft) => ({
    ...draft,
    id,
    user_id: user,
    version: 1,
    created_at: '2026-10-28T12:00:00Z',
    updated_at: '2026-10-28T12:00:00Z',
  }))
  vi.mocked(publishStory).mockResolvedValue({
    id: 'test',
    title: 'My first page',
    body: 'Private words',
    published_at: '2026-10-28T12:00:00Z',
  })
  vi.mocked(unpublishStory).mockResolvedValue(undefined)
})
function editor() {
  render(
    <MemoryRouter initialEntries={['/app/write']}>
      <Routes>
        <Route path="/app/write" element={<CloudEditor />} />
      </Routes>
    </MemoryRouter>,
  )
}
describe('real editor presentation', () => {
  it('saves privately and requires confirmation for publishing and unpublishing', async () => {
    editor()
    expect(screen.getByRole('button', { name: 'Publish story' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Entry title'), 'My first page')
    await userEvent.type(screen.getByLabelText('Journal body'), 'Private words')
    await userEvent.click(screen.getByRole('button', { name: 'Save entry' }))
    await waitFor(() =>
      expect(screen.getByText('Saved to your private account')).toBeVisible(),
    )
    expect(publishStory).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Publish story' }))
    expect(publishStory).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Everyone will be able to read',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm publish' }),
    )
    await screen.findByRole('button', { name: 'Unpublish story' })
    expect(publishStory).toHaveBeenCalledWith(
      {},
      'writer-a',
      expect.objectContaining({
        title: 'My first page',
        body: 'Private words',
      }),
      false,
    )
    await userEvent.type(
      screen.getByLabelText('Journal body'),
      ' NEW PRIVATE DRAFT',
    )
    expect(publishStory).toHaveBeenCalledTimes(1)
    await userEvent.click(
      screen.getByRole('button', { name: 'Unpublish story' }),
    )
    expect(unpublishStory).not.toHaveBeenCalled()
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm unpublish' }),
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Unpublish story' }),
      ).not.toBeInTheDocument(),
    )
    expect(unpublishStory).toHaveBeenCalledOnce()
  })
  it('renders markup as text, never as executable journal HTML', async () => {
    editor()
    await userEvent.type(
      screen.getByLabelText('Journal body'),
      '<script>bad()</script>',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(screen.getByText('<script>bad()</script>')).toBeVisible()
    expect(document.querySelector('.entry-preview script')).toBeNull()
  })
})
