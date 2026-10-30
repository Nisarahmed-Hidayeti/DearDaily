import { Editor } from '@tiptap/core'
import { it, expect } from 'vitest'
import { writingExtensions } from './extensions'
import { documentFromText, validateDocument } from './document'
import { applyBlock, editBlock } from './editorCommands'
it('reorders, duplicates and deletes only the active top-level block, with undo', () => {
  const e = new Editor({
    extensions: writingExtensions(),
    content: documentFromText('One\nTwo\nThree').content,
  })
  try {
    e.commands.setTextSelection(6)
    editBlock(e, 'up')
    expect(e.getText()).toBe('Two\n\nOne\n\nThree')
    editBlock(e, 'down')
    expect(e.getText()).toBe('One\n\nTwo\n\nThree')
    editBlock(e, 'duplicate')
    expect(e.getText()).toBe('One\n\nTwo\n\nTwo\n\nThree')
    editBlock(e, 'delete')
    expect(e.getText()).toBe('One\n\nTwo\n\nThree')
    e.commands.undo()
    expect(e.getText()).toContain('Two\n\nTwo')
  } finally {
    e.destroy()
  }
})
it('transforms a typed slash range without replacing neighboring paragraphs', () => {
  const e = new Editor({
    extensions: writingExtensions(),
    content: documentFromText('One\n/heading\nThree').content,
  })
  try {
    e.commands.setTextSelection(13)
    applyBlock(e, 'h2', { from: 6, to: 14 })
    expect(e.getJSON().content?.map((n) => n.type)).toEqual([
      'paragraph',
      'heading',
      'paragraph',
    ])
    expect(e.getText()).toContain('Three')
    expect(e.getText()).not.toContain('/heading')
  } finally {
    e.destroy()
  }
})
it('persists safe photographic crop metadata while rejecting arbitrary media paths', () => {
  const doc = {
    ...documentFromText('Original words'),
    page: { cover: 'forest-light', position: 73 },
  }
  expect(validateDocument(doc).page).toEqual(doc.page)
  for (const page of [
    { cover: 'https://private.invalid/a', position: 50 },
    { cover: 'forest-light', position: 999 },
    { cover: 'forest-light', position: 20, path: 'private-owner/a' },
  ])
    expect(() => validateDocument({ ...doc, page })).toThrow()
})
it('keeps the caret menu inside narrow and short viewports', async () => {
  const { menuPosition } = await import('./editorCommands')
  const original = { width: window.innerWidth, height: window.innerHeight }
  try {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 360,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    })
    for (const rect of [
      { left: 340, top: 560, bottom: 580 },
      { left: -10, top: 20, bottom: 40 },
    ]) {
      const p = menuPosition(rect)
      expect(p.left).toBeGreaterThanOrEqual(12)
      expect(p.left + p.width).toBeLessThanOrEqual(348)
      expect(p.top).toBeGreaterThanOrEqual(12)
      expect(p.top + 360).toBeLessThanOrEqual(588)
    }
  } finally {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: original.width,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: original.height,
    })
  }
})
it('exports photo placeholders without private identifiers or mutating the document', async () => {
  const { serializeMarkdown } = await import('./markdownBridge')
  const source = {
    type: 'doc',
    content: [
      {
        type: 'journalImage',
        attrs: {
          assetId: '81000000-0000-4000-8000-000000000001',
          alt: 'A quiet morning',
        },
      },
    ],
  }
  const markdown = await serializeMarkdown(source)
  expect(markdown).toContain('A quiet morning')
  expect(markdown).not.toContain(source.content[0].attrs.assetId)
  expect(source.content[0].attrs.assetId).toBeTruthy()
})
it('keeps constrained private and public image blocks through validation and reload', () => {
  const attrs = {
    assetId: '81000000-0000-4000-8000-000000000001',
    publicId: null,
    alt: 'A synthetic photograph',
    width: 'medium',
    align: 'center',
  }
  const doc = {
    ...documentFromText('Keep these words'),
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Keep these words' }],
        },
        { type: 'journalImage', attrs },
      ],
    },
  }
  expect(validateDocument(doc).content.content?.[1].type).toBe('journalImage')
  const e = new Editor({
    extensions: writingExtensions(),
    content: validateDocument(doc).content,
  })
  try {
    expect(
      validateDocument({ version: 1, content: e.getJSON() }).content
        .content?.[1].attrs?.assetId,
    ).toBe(attrs.assetId)
  } finally {
    e.destroy()
  }
  expect(
    validateDocument({
      ...doc,
      content: {
        type: 'doc',
        content: [
          {
            type: 'journalImage',
            attrs: {
              ...attrs,
              assetId: null,
              publicId: '82000000-0000-4000-8000-000000000001',
            },
          },
        ],
      },
    }).content.content?.[0].type,
  ).toBe('journalImage')
  expect(() =>
    validateDocument({
      ...doc,
      content: {
        type: 'doc',
        content: [
          {
            type: 'journalImage',
            attrs: { ...attrs, src: 'https://private.invalid/unsafe' },
          },
        ],
      },
    }),
  ).toThrow()
})
