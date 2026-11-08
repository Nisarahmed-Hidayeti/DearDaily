import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import CloudEditor from './CloudEditor'
import { loadEntry, saveEntry } from './journalApi'
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ client: {}, session: { user: { id: 'synthetic-owner' } } }),
}))
vi.mock('../rich-editor/config', () => ({
  richEditorEnabled: true,
  richPublicFields: ',writing_document,page_icon,cover_preset',
}))
vi.mock('./journalApi', async (original) => ({
  ...(await original<typeof import('./journalApi')>()),
  loadEntry: vi.fn(),
  saveEntry: vi.fn(async (_client, user, id, draft) => ({
    ...draft,
    id,
    user_id: user,
    version: 1,
    created_at: 'now',
    updated_at: 'now',
  })),
}))
it(
  'retains the cover dialog and editor when a first save adopts its canonical URL',
  { timeout: 10000 },
  async () => {
    let navigate: ReturnType<typeof useNavigate>
    function Page() {
      navigate = useNavigate()
      return <CloudEditor />
    }
    render(
      <MemoryRouter initialEntries={['/app/write']}>
        <Routes>
          <Route path="/app/write/:id?" element={<Page />} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.type(
      screen.getByLabelText('Entry title'),
      'Synthetic new page',
    )
    const body = await screen.findByRole('textbox', { name: 'Journal body' })
    await userEvent.click(
      screen.getByRole('button', { name: /Cover & page icon/ }),
    )
    expect(
      screen.getByRole('dialog', { name: 'Make this page yours' }),
    ).toBeVisible()
    await waitFor(() => expect(saveEntry).toHaveBeenCalled(), { timeout: 4000 })
    const savedId = vi.mocked(saveEntry).mock.calls.at(-1)![2]
    await act(async () => navigate('/app/write/' + savedId))
    expect(
      screen.getByRole('dialog', { name: 'Make this page yours' }),
    ).toBeVisible()
    expect(document.querySelector('[contenteditable="true"]')).toBe(body)
    expect(screen.getByLabelText('Entry title')).toHaveValue(
      'Synthetic new page',
    )
    expect(loadEntry).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await act(async () => navigate('/app/write'))
    expect(screen.getByLabelText('Entry title')).toHaveValue('')
    expect(
      await screen.findByRole('textbox', { name: 'Journal body' }),
    ).not.toBe(body)
    await userEvent.type(
      screen.getByLabelText('Entry title'),
      'A genuinely new page',
    )
    await userEvent.keyboard('{Control>}s{/Control}')
    await waitFor(() => expect(saveEntry).toHaveBeenCalledTimes(2))
    expect(vi.mocked(saveEntry).mock.calls[1][2]).not.toBe(savedId)
    expect(vi.mocked(saveEntry).mock.calls[1][4]).toBeNull()
  },
)
