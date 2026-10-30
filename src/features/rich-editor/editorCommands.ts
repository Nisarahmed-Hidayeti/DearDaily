import type { Editor } from '@tiptap/core'
import { Selection } from '@tiptap/pm/state'
import { closeHistory } from '@tiptap/pm/history'
export const blockCommands = [
  {
    id: 'text',
    label: 'Text',
    hint: 'A simple paragraph',
    keywords: 'paragraph normal',
  },
  {
    id: 'h1',
    label: 'Heading 1',
    hint: 'A chapter begins',
    keywords: 'heading title',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    hint: 'A little structure',
    keywords: 'heading subtitle',
  },
  {
    id: 'h3',
    label: 'Heading 3',
    hint: 'A smaller thought',
    keywords: 'heading',
  },
  {
    id: 'bullet',
    label: 'Bullet list',
    hint: 'Collect a few things',
    keywords: 'unordered bullet',
  },
  {
    id: 'numbered',
    label: 'Numbered list',
    hint: 'One thing after another',
    keywords: 'ordered number',
  },
  {
    id: 'todo',
    label: 'Checklist',
    hint: 'Small things to do',
    keywords: 'todo task checkbox',
  },
  {
    id: 'quote',
    label: 'Quote',
    hint: 'Words worth keeping',
    keywords: 'blockquote',
  },
  {
    id: 'divider',
    label: 'Divider',
    hint: 'A quiet pause',
    keywords: 'rule line',
  },
  {
    id: 'image',
    label: 'Photo',
    hint: 'Upload a private image',
    keywords: 'image photo picture',
  },
  {
    id: 'code',
    label: 'Code block',
    hint: 'Plain, precise, monospace',
    keywords: 'code',
  },
] as const
export type BlockCommand = (typeof blockCommands)[number]['id']
export function applyBlock(
  editor: Editor,
  id: BlockCommand,
  range?: { from: number; to: number },
) {
  const chain = editor.chain().focus()
  if (range && range.to > range.from) chain.deleteRange(range)
  if (id === 'text') chain.clearNodes().setParagraph()
  else if (id === 'h1' || id === 'h2' || id === 'h3')
    chain.setHeading({ level: Number(id[1]) as 1 | 2 | 3 })
  else if (id === 'bullet') chain.toggleBulletList()
  else if (id === 'numbered') chain.toggleOrderedList()
  else if (id === 'todo') chain.toggleTaskList()
  else if (id === 'quote') chain.toggleBlockquote()
  else if (id === 'divider') chain.setHorizontalRule()
  else if (id === 'code') chain.toggleCodeBlock()
  return chain.run()
}
export function currentBlock(editor: Editor) {
  const { $from } = editor.state.selection
  const index = $from.index(0)
  let from = 0
  for (let i = 0; i < index; i++) from += editor.state.doc.child(i).nodeSize
  return { index, from, node: editor.state.doc.child(index) }
}
export function editBlock(
  editor: Editor,
  action: 'up' | 'down' | 'duplicate' | 'delete' | 'add',
) {
  const { index, from, node } = currentBlock(editor),
    size = node.nodeSize
  const { state } = editor
  let tr = state.tr,
    target = from
  if (action === 'up') {
    if (!index) return false
    target = from - state.doc.child(index - 1).nodeSize
    tr = tr.delete(from, from + size).insert(target, node)
  } else if (action === 'down') {
    if (index === state.doc.childCount - 1) return false
    target = from + state.doc.child(index + 1).nodeSize
    tr = tr.delete(from, from + size).insert(target, node)
  } else if (action === 'duplicate') {
    target = from + size
    tr = tr.insert(target, node)
  } else if (action === 'add') {
    target = from + size
    tr = tr.insert(target, state.schema.nodes.paragraph.create())
  } else if (state.doc.childCount === 1)
    tr = tr.replaceWith(
      from,
      from + size,
      state.schema.nodes.paragraph.create(),
    )
  else tr = tr.delete(from, from + size)
  tr = tr.setSelection(
    Selection.near(tr.doc.resolve(Math.min(target + 1, tr.doc.content.size))),
  )
  editor.view.dispatch(closeHistory(tr).scrollIntoView())
  editor.view.focus()
  return true
}
export function menuPosition(
  rect: { left: number; bottom: number; top: number },
  height = 360,
) {
  const width = Math.min(300, window.innerWidth - 24)
  return {
    left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
    top:
      rect.bottom + height + 12 < window.innerHeight
        ? rect.bottom + 8
        : Math.max(12, rect.top - height - 8),
    width,
  }
}
