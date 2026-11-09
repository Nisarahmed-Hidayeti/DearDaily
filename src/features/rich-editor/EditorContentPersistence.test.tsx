import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { RichWriter } from './RichWriter'
import { documentFromText } from './document'
vi.mock('../media/MediaImage', () => ({
  MediaImage: () => <img alt="Synthetic photo" />,
}))
it('keeps image controls and focus through a JSONB key-order round trip without emitting a save', async () => {
  const doc = documentFromText('Keep these words')
  doc.content.content!.push({
    type: 'journalImage',
    attrs: {
      assetId: '81000000-0000-4000-8000-000000000001',
      publicId: null,
      alt: 'Synthetic caption',
      width: 'wide',
      align: 'center',
    },
  })
  const changed = vi.fn()
  const view = render(<RichWriter value={doc} onChange={changed} />)
  await screen.findByRole('textbox', { name: 'Journal body' })
  fireEvent.click(screen.getByText('Photo options', { exact: true }))
  const input = screen.getByLabelText('Caption & alt text')
  act(() => input.focus())
  const server = structuredClone(doc)
  server.content.content![1].attrs = Object.fromEntries(
    Object.entries(server.content.content![1].attrs!).reverse(),
  )
  changed.mockClear()
  view.rerender(<RichWriter value={server} onChange={changed} />)
  expect(screen.getByLabelText('Caption & alt text')).toBe(input)
  expect(input).toHaveFocus()
  expect(input.closest('details')).toHaveAttribute('open')
  expect(changed).not.toHaveBeenCalled()
  expect(
    screen.getByRole('textbox', { name: 'Journal body' }),
  ).toHaveTextContent('Keep these words')
})
