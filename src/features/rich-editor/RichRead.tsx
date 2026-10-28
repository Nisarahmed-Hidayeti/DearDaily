import './writer.css'
import { createElement, type ReactNode } from 'react'
import type { JSONContent } from '@tiptap/core'
import { validateDocument, type WritingDocument } from './document'
export function RichRead({
  document,
  fallback,
}: {
  document: unknown
  fallback: string
}) {
  let valid: WritingDocument | null = null
  try {
    valid = validateDocument(document)
  } catch {
    /* Fall back to the preserved plain text. */
  }
  if (!valid) return <p style={{ whiteSpace: 'pre-wrap' }}>{fallback}</p>

  const render = (node: JSONContent, key: number): ReactNode => {
    if (node.type === 'text') {
      let text: ReactNode = node.text
      for (const [i, mark] of (node.marks ?? []).entries()) {
        if (mark.type === 'link')
          text = (
            <a
              key={i}
              href={mark.attrs!.href}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              {text}
            </a>
          )
        else
          text = createElement(
            (
              {
                bold: 'strong',
                italic: 'em',
                underline: 'u',
                strike: 's',
                code: 'code',
              } as Record<string, string>
            )[mark.type],
            { key: i },
            text,
          )
      }
      return <span key={key}>{text}</span>
    }
    const children = node.content?.map(render)
    const tag = (
      {
        doc: 'div',
        paragraph: 'p',
        heading: `h${node.attrs?.level}`,
        bulletList: 'ul',
        orderedList: 'ol',
        listItem: 'li',
        taskList: 'ul',
        taskItem: 'li',
        blockquote: 'blockquote',
        horizontalRule: 'hr',
        hardBreak: 'br',
        codeBlock: 'pre',
      } as Record<string, string>
    )[node.type!]
    if (node.type === 'taskItem')
      return (
        <li key={key}>
          <input
            type="checkbox"
            checked={node.attrs!.checked}
            disabled
            aria-label={
              node.attrs!.checked ? 'Completed item' : 'Incomplete item'
            }
          />
          {children}
        </li>
      )
    return createElement(
      tag,
      {
        key,
        ...(node.type === 'orderedList' ? { start: node.attrs?.start } : {}),
        ...(node.type === 'taskList' ? { 'data-type': 'taskList' } : {}),
      },
      ...(children ?? []),
    )
  }
  return (
    <div className="rich-writer rich-read">
      <div className="tiptap">{render(valid.content, 0)}</div>
    </div>
  )
}
