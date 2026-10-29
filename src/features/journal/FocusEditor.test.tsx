import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { it, expect, vi } from 'vitest'
import CloudEditor from './CloudEditor'
import { saveEntry } from './journalApi'
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    client: {},
    session: { user: { id: 'synthetic-writer' } },
  }),
}))
vi.mock('../rich-editor/config', () => ({
  richEditorEnabled: true,
  richPublicFields: ',writing_document,page_icon,cover_preset',
}))
vi.mock('./journalApi', async (original) => ({
  ...(await original<typeof import('./journalApi')>()),
  saveEntry: vi.fn(async (_client, user, id, draft) => ({
    ...draft,
    id,
    user_id: user,
    version: 1,
    created_at: '2026-10-29T00:00:00Z',
    updated_at: '2026-10-29T00:00:00Z',
  })),
}))
// jsdom has no layout engine; these geometry shims keep real ProseMirror
// keyboard transactions operational. The editor and commands are not mocked.
Object.defineProperty(Document.prototype, 'elementFromPoint', {
  configurable: true,
  value: () => document.querySelector('.tiptap'),
})
Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: () => new DOMRect(),
})
Object.defineProperty(Range.prototype, 'getClientRects', {
  configurable: true,
  value: () => Object.assign([], { item: () => null }),
})
it(
  'keeps the live editor, selection and autosave intact while entering/exiting focus',
  { timeout: 10000 },
  async () => {
    render(
      <MemoryRouter>
        <CloudEditor />
      </MemoryRouter>,
    )
    const body = await screen.findByRole(
      'textbox',
      { name: 'Journal body' },
      { timeout: 4000 },
    )
    const user = userEvent.setup()
    await user.click(body)
    await user.paste('Synthetic focus words')
    expect(body).toHaveTextContent('Synthetic focus words')
    const before = document.getSelection()?.anchorOffset
    await userEvent.click(screen.getByRole('button', { name: 'Focus mode' }))
    expect(document.querySelector('.writer-focus')).not.toBeNull()
    expect(screen.getByRole('textbox', { name: 'Journal body' })).toBe(body)
    expect(body).toHaveFocus()
    expect(document.getSelection()?.anchorOffset).toBe(before)
    await waitFor(
      () =>
        expect(saveEntry).toHaveBeenCalledWith(
          {},
          'synthetic-writer',
          expect.any(String),
          expect.objectContaining({ body: 'Synthetic focus words' }),
          null,
        ),
      { timeout: 4000 },
    )
    await userEvent.keyboard('{Escape}')
    expect(document.querySelector('.writer-focus')).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Journal body' })).toBe(body)
    expect(body).toHaveTextContent('Synthetic focus words')
  },
)
it('dismisses the slash menu before Escape exits immersive focus', async () => {
  render(
    <MemoryRouter>
      <CloudEditor />
    </MemoryRouter>,
  )
  const body = await screen.findByRole(
    'textbox',
    { name: 'Journal body' },
    { timeout: 4000 },
  )
  await userEvent.click(body)
  await userEvent.click(screen.getByRole('button', { name: 'Focus mode' }))
  await userEvent.keyboard('/')
  expect(
    screen.getByRole('group', { name: 'Insert a block' }),
  ).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('group', { name: 'Insert a block' })).toBeNull()
  expect(document.querySelector('.writer-focus')).not.toBeNull()
  await userEvent.keyboard('{Escape}')
  expect(document.querySelector('.writer-focus')).toBeNull()
})
