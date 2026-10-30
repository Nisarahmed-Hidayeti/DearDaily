import type { JSONContent } from '@tiptap/core'
import { writingExtensions } from './extensions'
// Markdown's parser/serializer is loaded only for import/export, not first typing.
export async function markdownBridge() {
  const { MarkdownManager } = await import('@tiptap/markdown')
  return new MarkdownManager({ extensions: writingExtensions() })
}
export async function parseMarkdown(text: string) {
  return (await markdownBridge()).parse(text)
}
export async function serializeMarkdown(content: JSONContent) {
  // Never export private Storage references or expiring access URLs into a file.
  const portable = (node: JSONContent): JSONContent =>
    node.type === 'journalImage'
      ? {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: `[Photo omitted${node.attrs?.alt ? ': ' + String(node.attrs.alt) : ''}]`,
            },
          ],
        }
      : {
          ...node,
          ...(node.content ? { content: node.content.map(portable) } : {}),
        }
  return (await markdownBridge()).serialize(portable(content))
}
