import userEvent from '@testing-library/user-event'
import { it, expect, vi } from 'vitest'
import { StrictMode, useState } from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

it('retains the slash menu through caret scrolling and converts only the active block', async () => {
  const rect = {
    left: 30,
    right: 30,
    top: 100,
    bottom: 120,
    width: 0,
    height: 20,
    x: 30,
    y: 100,
    toJSON: () => ({}),
  }
  const before = Object.getOwnPropertyDescriptor(
    Range.prototype,
    'getBoundingClientRect',
  )
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  })
  const clientRects = Object.getOwnPropertyDescriptor(
    Range.prototype,
    'getClientRects',
  )
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: () => [rect],
  })
  function Writing() {
    const [doc, setDoc] = useState(documentFromText(''))
    return <RichWriter value={doc} onChange={setDoc} />
  }
  try {
    render(<Writing />)
    const body = await screen.findByRole('textbox', { name: 'Journal body' })
    body.focus()
    await userEvent.keyboard('/')
    await screen.findByRole('listbox', { name: 'Block commands' })
    fireEvent.scroll(document)
    fireEvent.resize(window)
    expect(
      screen.getByRole('listbox', { name: 'Block commands' }),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('option', { name: 'Checklist Small things to do' }),
    )
    expect(body.innerHTML).toContain('data-type="taskList"')
    expect(body).not.toHaveTextContent('/todo')
  } finally {
    if (before)
      Object.defineProperty(Range.prototype, 'getBoundingClientRect', before)
    else Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect')
    if (clientRects)
      Object.defineProperty(Range.prototype, 'getClientRects', clientRects)
    else Reflect.deleteProperty(Range.prototype, 'getClientRects')
  }
})
