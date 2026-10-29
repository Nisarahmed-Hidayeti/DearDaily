import { it, expect, vi } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { RichWriter } from './RichWriter'
import { documentFromText } from './document'
it('loading a saved document and enabling editing never emits an empty save', async () => {
  const onChange = vi.fn()
  const view = render(
    <RichWriter value={documentFromText('')} onChange={onChange} disabled />,
  )
  await screen.findByRole('textbox', { name: 'Journal body' })
  onChange.mockClear()
  view.rerender(
    <RichWriter
      value={documentFromText('Saved synthetic words')}
      onChange={onChange}
      disabled={false}
    />,
  )
  await waitFor(() =>
    expect(
      screen.getByRole('textbox', { name: 'Journal body' }),
    ).toHaveTextContent('Saved synthetic words'),
  )
  expect(onChange).not.toHaveBeenCalled()
})

it('mounts safely through StrictMode editor teardown and recreation', async () => {
  const onChange = vi.fn()
  render(
    <StrictMode>
      <RichWriter
        value={documentFromText('Strict mode words')}
        onChange={onChange}
      />
    </StrictMode>,
  )
  await waitFor(() =>
    expect(
      screen.getByRole('textbox', { name: 'Journal body' }),
    ).toHaveTextContent('Strict mode words'),
  )
  expect(onChange).not.toHaveBeenCalled()
})
