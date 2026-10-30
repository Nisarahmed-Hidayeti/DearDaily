import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RichRead } from './RichRead'
import { documentFromText } from './document'
describe('safe document rendering', () => {
  it('renders HTML-looking writing as literal text', () => {
    const text = '<script>private()</script>'
    const { container } = render(
      <RichRead document={documentFromText(text)} fallback="legacy" />,
    )
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
  })
  it('falls back to preserved text for unsupported image or script data', () => {
    const { container } = render(
      <RichRead
        document={{
          version: 1,
          content: {
            type: 'doc',
            content: [
              { type: 'image', attrs: { src: 'https://tracker.example' } },
            ],
          },
        }}
        fallback="Original private words"
      />,
    )
    expect(screen.getByText('Original private words')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
  it('rejects executable URLs and never emits a link for them', () => {
    const doc = documentFromText('click')
    doc.content.content![0].content![0].marks = [
      { type: 'link', attrs: { href: 'javascript:alert(1)' } },
    ]
    render(<RichRead document={doc} fallback="Original" />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Original')).toBeInTheDocument()
  })
  it('isolates valid outgoing links from the opener and referrer', () => {
    const doc = documentFromText('Reference')
    doc.content.content![0].content![0].marks = [
      { type: 'link', attrs: { href: 'https://example.com' } },
    ]
    render(<RichRead document={doc} fallback="Original" />)
    expect(screen.getByRole('link')).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    )
    expect(screen.getByRole('link')).toHaveAttribute(
      'referrerpolicy',
      'no-referrer',
    )
  })
})
