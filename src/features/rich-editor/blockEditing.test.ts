import { Editor } from '@tiptap/core'
import { expect, it } from 'vitest'
import { writingExtensions } from './extensions'
import { documentFromText, validateDocument } from './document'
it('keeps independent paragraphs, mixed lists and a checklist intact through formatting, undo/redo and reload', () => {
  const editor = new Editor({
    extensions: writingExtensions(),
    content: documentFromText(
      'First paragraph\nSecond paragraph\nThird paragraph',
    ).content,
  })
  let reloaded: Editor | undefined
  const position = (text: string) => {
    let result = -1
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text === text) result = pos
    })
    if (result < 0) throw Error('Missing fixture block')
    return result
  }
  try {
    editor.commands.setTextSelection(position('Second paragraph'))
    editor.commands.toggleBulletList()
    expect(
      editor
        .getJSON()
        .content?.slice(0, 3)
        .map((n) => n.type),
    ).toEqual(['paragraph', 'bulletList', 'paragraph'])
    editor.commands.setTextSelection(position('Third paragraph'))
    editor.commands.toggleOrderedList()
    expect(
      editor
        .getJSON()
        .content?.slice(0, 3)
        .map((n) => n.type),
    ).toEqual(['paragraph', 'bulletList', 'orderedList'])
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.commands.toggleTaskList()
    editor.commands.insertContent('A small task')
    expect(editor.getText()).toContain('Second paragraph')
    expect(editor.getJSON().content?.some((n) => n.type === 'taskList')).toBe(
      true,
    )
    const before = editor.getJSON()
    editor.commands.setTextSelection({
      from: position('First paragraph'),
      to: position('First paragraph') + 5,
    })
    editor.commands.toggleBold()
    const formatted = editor.getJSON()
    expect(formatted.content?.[0].content?.[0].marks?.[0].type).toBe('bold')
    expect(formatted.content?.[1]).toEqual(before.content?.[1])
    expect(formatted.content?.[2]).toEqual(before.content?.[2])
    editor.commands.undo()
    expect(editor.getJSON()).toEqual(before)
    editor.commands.redo()
    expect(editor.getJSON()).toEqual(formatted)
    const saved = validateDocument({ version: 1, content: editor.getJSON() })
    reloaded = new Editor({
      extensions: writingExtensions(),
      content: JSON.parse(JSON.stringify(saved.content)),
    })
    expect(reloaded.getJSON()).toEqual(editor.getJSON())
  } finally {
    editor.destroy()
    reloaded?.destroy()
  }
})
