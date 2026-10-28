import type { JSONContent } from '@tiptap/core'

export interface WritingDocument {
  version: 1
  content: JSONContent
}
export const pageIcons = [
  '🌿',
  '☀️',
  '🌙',
  '✨',
  '📖',
  '🪷',
  '🌊',
  '🍂',
  '💭',
  '🧡',
  '✈️',
  '🌻',
] as const
export const coverPresets = ['none', 'dawn', 'forest', 'ocean', 'clay'] as const
export type CoverPreset = (typeof coverPresets)[number]

export function safeWritingLink(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    /\s/.test(value) ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return false
  try {
    const url = new URL(value)
    return (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

// Reject unknown formats instead of silently deleting unsupported content.
// No arbitrary HTML, CSS, remote embeds, image URLs or private storage paths.
export function validateDocument(value: unknown): WritingDocument {
  if (
    !value ||
    typeof value !== 'object' ||
    JSON.stringify(value).length > 400000
  )
    throw new Error('Document is too large or invalid.')
  const doc = value as WritingDocument
  if (doc.version !== 1 || doc.content?.type !== 'doc')
    throw new Error('Unsupported document version.')
  let nodes = 0,
    text = 0
  const children: Record<string, string[]> = {
    doc: [
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'taskList',
      'blockquote',
      'horizontalRule',
      'codeBlock',
    ],
    paragraph: ['text', 'hardBreak'],
    heading: ['text', 'hardBreak'],
    bulletList: ['listItem'],
    orderedList: ['listItem'],
    taskList: ['taskItem'],
    listItem: ['paragraph', 'bulletList', 'orderedList', 'taskList'],
    taskItem: ['paragraph', 'bulletList', 'orderedList', 'taskList'],
    blockquote: [
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'taskList',
      'blockquote',
      'codeBlock',
    ],
    codeBlock: ['text'],
    text: [],
    hardBreak: [],
    horizontalRule: [],
  }
  function visit(node: JSONContent, depth: number) {
    if (
      ++nodes > 10000 ||
      depth > 16 ||
      !Object.hasOwn(children, node.type ?? '')
    )
      throw new Error('Unsupported or oversized block.')
    if (
      Object.keys(node).some(
        (k) => !['type', 'attrs', 'content', 'text', 'marks'].includes(k),
      )
    )
      throw new Error('Unsupported block data.')
    if (node.text !== undefined) {
      if (node.type !== 'text' || typeof node.text !== 'string')
        throw new Error('Invalid text.')
      text += node.text.length
    }
    if (text > 100000) throw new Error('Keep entries under 100,000 characters.')
    const attrs = node.attrs ?? {}
    const allowed =
      node.type === 'heading'
        ? ['level']
        : node.type === 'orderedList'
          ? ['start', 'type']
          : node.type === 'taskItem'
            ? ['checked']
            : node.type === 'codeBlock'
              ? ['language']
              : []
    if (Object.keys(attrs).some((k) => !allowed.includes(k)))
      throw new Error('Unsupported block attributes.')
    if (node.type === 'heading' && ![1, 2, 3].includes(attrs.level))
      throw new Error('Unsupported heading.')
    if (node.type === 'taskItem' && typeof attrs.checked !== 'boolean')
      throw new Error('Invalid checklist.')
    if (
      node.type === 'orderedList' &&
      attrs.start != null &&
      (!Number.isInteger(attrs.start) || attrs.start < 1 || attrs.start > 10000)
    )
      throw new Error('Invalid list start.')
    if (node.type === 'orderedList' && attrs.type != null && attrs.type !== '1')
      throw new Error('Unsupported list style.')
    if (
      node.type === 'codeBlock' &&
      attrs.language != null &&
      (typeof attrs.language !== 'string' ||
        !/^[\w+-]{1,40}$/.test(attrs.language))
    )
      throw new Error('Invalid code language.')
    if (
      node.marks !== undefined &&
      (!Array.isArray(node.marks) || node.type !== 'text')
    )
      throw new Error('Invalid formatting.')
    for (const mark of node.marks ?? []) {
      if (
        !['bold', 'italic', 'underline', 'strike', 'code', 'link'].includes(
          mark.type,
        )
      )
        throw new Error('Unsupported formatting.')
      if (Object.keys(mark).some((k) => !['type', 'attrs'].includes(k)))
        throw new Error('Unsupported formatting data.')
      if (mark.type === 'link') {
        if (
          !safeWritingLink(mark.attrs?.href) ||
          Object.keys(mark.attrs ?? {}).some(
            (k) => !['href', 'target', 'rel', 'class', 'title'].includes(k),
          )
        )
          throw new Error(
            'Use a complete http or https link without credentials.',
          )
      } else if (Object.keys(mark.attrs ?? {}).length)
        throw new Error('Unsupported formatting attributes.')
    }
    if (node.content !== undefined && !Array.isArray(node.content))
      throw new Error('Invalid block content.')
    for (const child of node.content ?? []) {
      if (!children[node.type!].includes(child.type ?? ''))
        throw new Error('Unsupported block nesting.')
      visit(child, depth + 1)
    }
  }
  visit(doc.content, 0)
  return structuredClone(doc)
}
export function documentFromText(text: string): WritingDocument {
  return validateDocument({
    version: 1,
    content: {
      type: 'doc',
      content: text.split('\n').map((line) => ({
        type: 'paragraph',
        ...(line ? { content: [{ type: 'text', text: line }] } : {}),
      })),
    },
  })
}
export function documentText(document: WritingDocument): string {
  const block = (node: JSONContent): string =>
    node.type === 'text'
      ? (node.text ?? '')
      : node.type === 'hardBreak'
        ? '\n'
        : (node.content ?? [])
            .map(block)
            .join(
              ['paragraph', 'heading', 'codeBlock'].includes(node.type ?? '')
                ? ''
                : '\n',
            )
  return block(validateDocument(document).content)
}
