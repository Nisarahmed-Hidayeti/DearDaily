import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from '@tiptap/markdown'
import {
  documentFromText,
  documentText,
  safeWritingLink,
  validateDocument,
} from './document'

const document = (node: unknown) => ({
  version: 1,
  content: { type: 'doc', content: [node] },
})
describe('versioned writing boundary', () => {
  it('keeps legacy words, empty lines, markup and emoji as literal text', () => {
    const original =
      'First day 🌿\n\n<script>alert(1)</script>\n# A literal heading'
    expect(documentText(documentFromText(original))).toBe(original)
  })
  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    '//tracker.example/image',
    'https://user:password@example.com',
    'https://example.com\n/path',
  ])('rejects unsafe links %s', (href) => {
    expect(safeWritingLink(href)).toBe(false)
    expect(() =>
      validateDocument(
        document({
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'click',
              marks: [{ type: 'link', attrs: { href } }],
            },
          ],
        }),
      ),
    ).toThrow()
  })
  it.each([
    { type: 'image', attrs: { src: 'https://tracker.example/private' } },
    {
      type: 'paragraph',
      attrs: { style: 'background:url(https://tracker.example)' },
    },
    { type: 'heading', attrs: { level: 6 } },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'x', marks: [{ type: 'html' }] }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'x',
          marks: [{ type: 'bold', attrs: { onclick: 'bad' } }],
        },
      ],
    },
  ])(
    'rejects unsupported blocks/attributes instead of discarding them',
    (node) => {
      expect(() => validateDocument(document(node))).toThrow()
    },
  )
  it('bounds document sizes and rejects future versions', () => {
    expect(() => documentFromText('x'.repeat(100001))).toThrow()
    expect(() =>
      validateDocument({ ...document({ type: 'paragraph' }), version: 2 }),
    ).toThrow()
  })
  it('isolates returned documents from later object mutation', () => {
    const original = documentFromText('First')
    const validated = validateDocument(original)
    original.content.content![0].content![0].text = 'Changed'
    expect(documentText(validated)).toBe('First')
  })
  it('round trips supported Markdown using the actual editor schema', () => {
    const editor = new Editor({
      extensions: [StarterKit, TaskList, TaskItem, Markdown],
      content: '',
      contentType: 'markdown',
    })
    try {
      editor.commands.setContent(
        '# Morning\n\n**Strong** and *gentle*.\n\n- [x] Remember today\n\n> A quiet moment\n\n---\n\n```js\nconst day = 1\n```',
        { contentType: 'markdown' },
      )
      const value = validateDocument({ version: 1, content: editor.getJSON() })
      expect(documentText(value)).toContain('Remember today')
      expect(editor.getMarkdown()).toContain('**Strong**')
      expect(editor.getMarkdown()).toContain('[x]')
      expect(editor.getMarkdown()).toContain('const day = 1')
    } finally {
      editor.destroy()
    }
  })
})
