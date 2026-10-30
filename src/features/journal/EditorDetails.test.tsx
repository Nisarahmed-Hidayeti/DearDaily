import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import CloudEditor from './CloudEditor'
import { loadEntry, saveEntry, publishStory, readStories } from './journalApi'
import { documentFromText } from '../rich-editor/document'
const auth = vi.hoisted(() => ({ client: {} }))
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ client: auth.client, session: { user: { id: 'A' } } }),
}))
vi.mock('../rich-editor/config', () => ({
  richEditorEnabled: true,
  richPublicFields: ',writing_document,page_icon,cover_preset',
}))
vi.mock('../community/communityApi', async (original) => ({
  ...(await original<typeof import('../community/communityApi')>()),
  communityEnabled: true,
  myProfile: async () => ({ username: 'quiet_writer', visible: true }),
}))
vi.mock('./journalApi', async (original) => ({
  ...(await original<typeof import('./journalApi')>()),
  loadEntry: vi.fn(),
  saveEntry: vi.fn(),
  publishStory: vi.fn(),
  readStories: vi.fn().mockResolvedValue([]),
}))
const fixture = {
  id: 'synthetic-details',
  user_id: 'A',
  version: 1,
  title: 'Synthetic details',
  body: 'Keep this private writing',
  mood: 'Reflective' as const,
  tags: ['private-tag'],
  category: 'Personal',
  entry_date: '2026-10-29',
  status: 'saved' as const,
  created_at: 'now',
  updated_at: 'now',
  writing_document: {
    ...documentFromText('Keep this private writing'),
    publication: { category: 'Travel', tags: 'public, beta', byline: true },
  },
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readStories).mockResolvedValue([])
  vi.mocked(loadEntry).mockResolvedValue(structuredClone(fixture))
  vi.mocked(saveEntry).mockImplementation(async (_c, _u, _id, draft) => ({
    ...fixture,
    ...draft,
    version: 2,
  }))
  vi.mocked(publishStory).mockResolvedValue({
    id: fixture.id,
    title: fixture.title,
    body: fixture.body,
    published_at: 'now',
  })
})
function show() {
  return render(
    <MemoryRouter initialEntries={['/app/write/synthetic-details']}>
      <Routes>
        <Route path="/app/write/:id" element={<CloudEditor />} />
      </Routes>
    </MemoryRouter>,
  )
}
it('saves public choices once, preserves private metadata and confirms a read-only receipt', async () => {
  show()
  await screen.findByText('Saved to your private account')
  const editor = await screen.findByRole(
    'textbox',
    { name: 'Journal body' },
    { timeout: 4000 },
  )
  await userEvent.click(
    screen.getByRole('button', { name: /The little details/ }),
  )
  await userEvent.selectOptions(
    screen.getByLabelText('Public category'),
    'Gratitude',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Save entry' }))
  await waitFor(() =>
    expect(saveEntry).toHaveBeenCalledWith(
      expect.anything(),
      'A',
      fixture.id,
      expect.objectContaining({
        category: 'Personal',
        tags: ['private-tag'],
        writing_document: expect.objectContaining({
          publication: {
            category: 'Gratitude',
            tags: 'public, beta',
            byline: true,
          },
        }),
      }),
      1,
    ),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Publish story' }))
  const dialog = screen.getByRole('dialog', { name: 'Ready to publish?' })
  expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()
  expect(dialog).toHaveTextContent('Gratitude')
  expect(dialog).toHaveTextContent('@quiet_writer')
  expect(dialog).not.toHaveTextContent('private-tag')
  expect(publishStory).not.toHaveBeenCalled()
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Publish now' }),
  )
  await waitFor(() =>
    expect(publishStory).toHaveBeenCalledWith(
      expect.anything(),
      'A',
      expect.anything(),
      false,
      {
        public_username: 'quiet_writer',
        public_category: 'Gratitude',
        public_tags: ['public', 'beta'],
      },
    ),
  )
  expect(screen.getByRole('textbox', { name: 'Journal body' })).toBe(editor)
})
it('opens a compact mobile sheet, respects available keyboard space and returns to the same editor', async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  vi.stubGlobal('visualViewport', {
    height: 420,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  try {
    show()
    await screen.findByText('Saved to your private account')
    const editor = await screen.findByRole(
      'textbox',
      { name: 'Journal body' },
      { timeout: 4000 },
    )
    await userEvent.click(
      screen.getByRole('button', { name: /The little details/ }),
    )
    const dialog = screen.getByRole('dialog', { name: 'The little details' })
    expect(dialog).toHaveClass('editor-details-sheet')
    expect(dialog.style.getPropertyValue('--available-height')).toBe('420px')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Journal body' })).toBe(editor)
  } finally {
    vi.unstubAllGlobals()
  }
})

it('retains legacy explicit public choices privately without copying private tags', async () => {
  const legacy = {
    ...fixture,
    writing_document: documentFromText(fixture.body),
  }
  vi.mocked(loadEntry).mockResolvedValue(legacy)
  const snapshot = {
    id: fixture.id,
    title: fixture.title,
    body: fixture.body,
    published_at: 'now',
    public_category: 'Travel',
    public_tags: ['previous-public'],
    public_username: null,
  }
  vi.mocked(readStories).mockResolvedValue([snapshot])
  show()
  await screen.findByText('Saved to your private account')
  await userEvent.click(
    screen.getByRole('button', { name: /The little details/ }),
  )
  expect(screen.getByLabelText('Public category')).toHaveValue('Travel')
  expect(
    screen.getByLabelText('Public tags (up to 5, comma separated)'),
  ).toHaveValue('previous-public')
  expect(
    screen.getByRole('checkbox', { name: /Attribute this story/ }),
  ).not.toBeChecked()
  await userEvent.click(screen.getByRole('button', { name: 'Save entry' }))
  await waitFor(() =>
    expect(saveEntry).toHaveBeenCalledWith(
      expect.anything(),
      'A',
      fixture.id,
      expect.objectContaining({
        tags: ['private-tag'],
        writing_document: expect.objectContaining({
          publication: {
            category: 'Travel',
            tags: 'previous-public',
            byline: false,
          },
        }),
      }),
      1,
    ),
  )
})
