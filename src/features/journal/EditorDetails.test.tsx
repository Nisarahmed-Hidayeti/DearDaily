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
it('reviews editable public choices once without changing private metadata or historical dates', async () => {
  show()
  await screen.findByText('Saved to your private account')
  const editor = await screen.findByRole(
    'textbox',
    { name: 'Journal body' },
    { timeout: 4000 },
  )
  await userEvent.click(screen.getByRole('button', { name: /Share & details/ }))
  expect(screen.queryByLabelText('Journal date')).toBeNull()
  expect(screen.queryByLabelText('Public category')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Publish story' }))
  const dialog = screen.getByRole('dialog', { name: 'Ready to publish?' })
  expect(within(dialog).getByLabelText('Category to share')).toHaveValue(
    'Travel',
  )
  expect(within(dialog).getByLabelText('Tags to share')).toHaveValue(
    'public, beta',
  )
  await userEvent.selectOptions(
    within(dialog).getByLabelText('Category to share'),
    'Gratitude',
  )
  await waitFor(
    () =>
      expect(saveEntry).toHaveBeenCalledWith(
        expect.anything(),
        'A',
        fixture.id,
        expect.objectContaining({
          category: 'Personal',
          tags: ['private-tag'],
          entry_date: fixture.entry_date,
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
    { timeout: 4000 },
  )
  expect(publishStory).not.toHaveBeenCalled()
  expect(dialog).not.toHaveTextContent('private-tag')
  await waitFor(() =>
    expect(
      within(dialog).getByRole('button', { name: 'Publish now' }),
    ).toBeEnabled(),
  )
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
}, 15000)

it('proposes private category/tags but permits excluding them before explicit publication', async () => {
  vi.mocked(loadEntry).mockResolvedValue({
    ...fixture,
    writing_document: documentFromText(fixture.body),
  })
  show()
  await screen.findByText('Saved to your private account')
  await userEvent.click(screen.getByRole('button', { name: /Share & details/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Publish story' }))
  const dialog = screen.getByRole('dialog', { name: 'Ready to publish?' })
  expect(within(dialog).getByLabelText('Category to share')).toHaveValue(
    'Personal',
  )
  expect(within(dialog).getByLabelText('Tags to share')).toHaveValue(
    'private-tag',
  )
  expect(publishStory).not.toHaveBeenCalled()
  await userEvent.selectOptions(
    within(dialog).getByLabelText('Category to share'),
    'Uncategorized',
  )
  await userEvent.clear(within(dialog).getByLabelText('Tags to share'))
  await waitFor(
    () =>
      expect(
        within(dialog).getByRole('button', { name: 'Publish now' }),
      ).toBeEnabled(),
    { timeout: 4000 },
  )
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
        public_username: null,
        public_category: 'Uncategorized',
        public_tags: [],
      },
    ),
  )
  expect(vi.mocked(saveEntry).mock.calls.at(-1)?.[3]).toMatchObject({
    category: 'Personal',
    tags: ['private-tag'],
    entry_date: fixture.entry_date,
  })
}, 15000)
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
      screen.getByRole('button', { name: /Share & details/ }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Page details' })
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
  await userEvent.click(screen.getByRole('button', { name: /Share & details/ }))
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
  await userEvent.click(
    screen.getByRole('button', { name: 'Update public story' }),
  )
  expect(screen.getByLabelText('Category to share')).toHaveValue('Travel')
  expect(screen.getByLabelText('Tags to share')).toHaveValue('previous-public')
  expect(
    screen.getByRole('checkbox', { name: /Attribute this story/ }),
  ).not.toBeChecked()
})
it('preserves legacy plaintext when adding and removing a page icon', async () => {
  vi.mocked(loadEntry).mockResolvedValue({ ...fixture, writing_document: null })
  show()
  await screen.findByText('Saved to your private account')
  const editor = await screen.findByRole(
    'textbox',
    { name: 'Journal body' },
    { timeout: 4000 },
  )
  expect(editor).toHaveTextContent(fixture.body)
  await userEvent.click(
    screen.getByRole('button', { name: /Cover & page icon/ }),
  )
  await userEvent.type(
    screen.getByRole('searchbox', { name: 'Search page icons' }),
    'kitten',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Use 🐱' }))
  await userEvent.click(
    screen.getByRole('button', { name: 'Apply page style' }),
  )
  expect(editor).toHaveTextContent(fixture.body)
  expect(screen.getByRole('textbox', { name: 'Journal body' })).toBe(editor)
})

it('opens page details without exiting immersive writing or changing the saved focus preference', async () => {
  localStorage.setItem('deardaily.writing-focus', 'true')
  show()
  await screen.findByText('Saved to your private account')
  await userEvent.click(screen.getByRole('button', { name: 'Share & details' }))
  expect(document.querySelector('.editor-page')).toHaveClass('writer-focus')
  expect(localStorage.getItem('deardaily.writing-focus')).toBe('true')
})
