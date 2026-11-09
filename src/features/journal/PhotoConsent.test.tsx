import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import CloudEditor from './CloudEditor'
import { documentFromText } from '../rich-editor/document'
import type { JournalEntry } from './journalApi'

const fixture = vi.hoisted(() => ({
  row: null as JournalEntry | null,
  action: vi.fn(),
}))
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ client: null, session: null }),
}))
vi.mock('./useJournalEntry', () => ({
  useJournalEntry: () => ({
    row: fixture.row,
    draft: fixture.row,
    setDraft: vi.fn(),
    ready: true,
    busy: false,
    error: '',
    dirty: false,
    published: false,
    publicMetadata: null,
    action: fixture.action,
    save: vi.fn(),
  }),
}))

it('keeps approval for metadata-only saves but requires fresh consent if the photo set changes', async () => {
  const row = (id: string, version: number) =>
    ({
      id: 'synthetic',
      user_id: 'A',
      version,
      title: 'Synthetic consent',
      body: 'Synthetic writing',
      mood: 'Calm',
      category: 'Personal',
      tags: [],
      entry_date: '2026-10-29',
      created_at: '2026-10-29T12:00:00Z',
      updated_at: '2026-10-29T12:00:00Z',
      status: 'saved',
      writing_document: {
        ...documentFromText('Synthetic writing'),
        page: { cover: 'upload', assetId: id, position: 50 },
      },
    }) as JournalEntry
  fixture.row = row('95000000-0000-4000-8000-000000000001', 1)
  const view = render(
    <MemoryRouter>
      <CloudEditor />
    </MemoryRouter>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Publish story' }))
  const consent = screen.getByRole('checkbox', {
    name: /I approve publishing these photos/,
  })
  expect(screen.getByRole('button', { name: 'Publish now' })).toBeDisabled()
  await userEvent.click(consent)
  fixture.row = row('95000000-0000-4000-8000-000000000001', 2)
  view.rerender(
    <MemoryRouter>
      <CloudEditor />
    </MemoryRouter>,
  )
  expect(consent).toBeChecked()
  expect(screen.getByRole('button', { name: 'Publish now' })).toBeEnabled()
  fixture.row = row('95000000-0000-4000-8000-000000000002', 3)
  view.rerender(
    <MemoryRouter>
      <CloudEditor />
    </MemoryRouter>,
  )
  expect(consent).not.toBeChecked()
  expect(screen.getByRole('button', { name: 'Publish now' })).toBeDisabled()
  expect(fixture.action).not.toHaveBeenCalled()
})
