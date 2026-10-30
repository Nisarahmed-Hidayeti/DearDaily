import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { PageAppearance } from './PageAppearance'
import { emojiCatalog, compatibleLegacyIcon, entryIcon } from './emojis'
import {
  documentFromText,
  publicWritingDocument,
  validateDocument,
} from './document'
it('offers hundreds of unique searchable icons and preserves legacy database compatibility', () => {
  expect(emojiCatalog.length).toBeGreaterThan(200)
  expect(new Set(emojiCatalog.map((v) => v.emoji)).size).toBe(
    emojiCatalog.length,
  )
  expect(compatibleLegacyIcon('🌿')).toBe('🌿')
  expect(compatibleLegacyIcon('🐱')).toBeNull()
  const doc = validateDocument({
    ...documentFromText('Original words'),
    icon: '🐱',
  })
  expect(entryIcon(doc, null)).toBe('🐱')
  expect(publicWritingDocument(doc).icon).toBe('🐱')
  expect(() => validateDocument({ ...doc, icon: '<script>' })).toThrow()
})
it('searches and applies a new emoji in structured content without changing legacy column constraints', async () => {
  const onApply = vi.fn(),
    doc = documentFromText('Original words')
  const view = render(<PageAppearance document={doc} onApply={onApply} />)
  await userEvent.click(
    screen.getByRole('button', { name: /Cover & page icon/ }),
  )
  await userEvent.type(
    screen.getByRole('searchbox', { name: 'Search page icons' }),
    'kitten',
  )
  expect(screen.getAllByRole('button', { name: /^Use / })).toHaveLength(1)
  await userEvent.click(screen.getByRole('button', { name: 'Use 🐱' }))
  await userEvent.click(
    screen.getByRole('button', { name: 'Apply page style' }),
  )
  const saved = onApply.mock.calls[0][0]
  expect(saved.icon).toBeNull()
  expect(saved.document.icon).toBe('🐱')
  expect(saved.document.content).toEqual(doc.content)
  view.rerender(
    <PageAppearance
      document={saved.document}
      icon={saved.icon}
      onApply={onApply}
    />,
  )
  expect(
    screen.getByRole('button', { name: /🐱 Cover & page icon/ }),
  ).toBeVisible()
})
it('waits for cover upload confirmation before applying a new private image', async () => {
  let finish: (id: string) => void = () => {}
  const onUpload = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve
        }),
    ),
    onApply = vi.fn()
  render(
    <PageAppearance
      document={documentFromText('Keep these words')}
      onUpload={onUpload}
      onApply={onApply}
    />,
  )
  await userEvent.click(
    screen.getByRole('button', { name: /Cover & page icon/ }),
  )
  await userEvent.upload(
    screen.getByLabelText('Upload cover from computer'),
    new File(['synthetic'], 'synthetic.jpg', { type: 'image/jpeg' }),
  )
  expect(
    screen.getByRole('button', { name: 'Apply page style' }),
  ).toBeDisabled()
  expect(onApply).not.toHaveBeenCalled()
  finish('81000000-0000-4000-8000-000000000001')
  await screen.findByRole('button', { name: 'Apply page style' })
  await userEvent.click(
    screen.getByRole('button', { name: 'Apply page style' }),
  )
  expect(onApply).toHaveBeenCalledWith(
    expect.objectContaining({
      document: expect.objectContaining({
        page: {
          cover: 'upload',
          assetId: '81000000-0000-4000-8000-000000000001',
          position: 50,
        },
      }),
    }),
  )
})
