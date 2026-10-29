import { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from '@tiptap/markdown'
import { documentText, safeWritingLink, validateDocument } from './document'
import type { WritingDocument } from './document'
import './writer.css'

export function RichWriter({
  value,
  onChange,
  disabled = false,
}: {
  value: WritingDocument
  onChange: (value: WritingDocument) => void
  disabled?: boolean
}) {
  const [error, setError] = useState('')
  const [slash, setSlash] = useState(false)
  const [importText, setImportText] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: false,
          isAllowedUri: (url) => safeWritingLink(url),
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: 'Write something, or type / for commands…',
      }),
      Markdown,
    ],
    content: validateDocument(value).content,
    editable: !disabled,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Journal body',
        'aria-multiline': 'true',
        spellcheck: 'true',
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Escape') {
          setSlash(false)
          return false
        }
        if (
          event.key === '/' &&
          view.state.selection.empty &&
          view.state.selection.$from.parent.textContent === ''
        ) {
          event.preventDefault()
          setSlash(true)
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: current }) => {
      if (disabled) return
      try {
        onChange(validateDocument({ version: 1, content: current.getJSON() }))
        setError('')
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Unsupported content. Export a copy before leaving.',
        )
      }
    },
  })
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(!disabled, false)
  }, [editor, disabled])
  // Only a confirmed reload changes value independently; never reset typing or history.
  useEffect(() => {
    if (
      editor &&
      !editor.isDestroyed &&
      JSON.stringify(editor.getJSON()) !== JSON.stringify(value.content)
    )
      editor.commands.setContent(value.content, { emitUpdate: false })
  }, [editor, value])
  if (!editor) return <p>Preparing your writing space…</p>
  const command = (name: string) => {
    const chain = editor.chain().focus()
    if (name === 'heading') chain.toggleHeading({ level: 2 }).run()
    if (name === 'bullet') chain.toggleBulletList().run()
    if (name === 'numbered') chain.toggleOrderedList().run()
    if (name === 'todo') chain.toggleTaskList().run()
    if (name === 'quote') chain.toggleBlockquote().run()
    if (name === 'divider') chain.setHorizontalRule().run()
    if (name === 'code') chain.toggleCodeBlock().run()
    setSlash(false)
  }
  const tools = (
    <>
      {(['bold', 'italic', 'underline', 'strike', 'code'] as const).map(
        (name) => (
          <button
            key={name}
            type="button"
            disabled={disabled}
            aria-label={name}
            aria-pressed={editor.isActive(name)}
            onClick={() => editor.chain().focus().toggleMark(name).run()}
          >
            {name === 'bold' ? (
              <b>B</b>
            ) : name === 'italic' ? (
              <i>I</i>
            ) : name === 'underline' ? (
              <u>U</u>
            ) : name === 'strike' ? (
              <s>S</s>
            ) : (
              '&lt;/&gt;'
            )}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setLink(editor.getAttributes('link').href ?? '')}
      >
        Link
      </button>
    </>
  )
  return (
    <div className="rich-writer">
      <details className="writer-format-options">
        <summary>Formatting</summary>
        <div className="writer-toolbar" role="group" aria-label="Writing tools">
          {tools}
          <label>
            <span className="sr-only">Block style</span>
            <select
              disabled={disabled}
              value={
                editor.isActive('heading')
                  ? `h${editor.getAttributes('heading').level}`
                  : 'paragraph'
              }
              onChange={(e) => {
                const v = e.target.value
                if (v === 'paragraph')
                  editor.chain().focus().setParagraph().run()
                else
                  editor
                    .chain()
                    .focus()
                    .setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 })
                    .run()
              }}
            >
              <option value="paragraph">Text</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
          </label>
          <button
            type="button"
            disabled={disabled}
            aria-expanded={slash}
            onClick={() => setSlash(!slash)}
          >
            + Block
          </button>
          <button
            type="button"
            aria-label="Undo"
            disabled={disabled || !editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↶
          </button>
          <button
            type="button"
            aria-label="Redo"
            disabled={disabled || !editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↷
          </button>
        </div>
      </details>
      <BubbleMenu editor={editor}>
        <div
          className="writer-toolbar writer-bubble"
          role="group"
          aria-label="Selection formatting"
        >
          {tools}
        </div>
      </BubbleMenu>
      {slash && (
        <div className="block-picker" role="group" aria-label="Insert a block">
          {[
            'heading',
            'bullet',
            'numbered',
            'todo',
            'quote',
            'divider',
            'code',
          ].map((name) => (
            <button key={name} type="button" onClick={() => command(name)}>
              /{name}
            </button>
          ))}
          <p>
            /image · Photo uploads are waiting for approved private storage.
          </p>
          <button type="button" onClick={() => setSlash(false)}>
            Close block menu
          </button>
        </div>
      )}
      {link !== null && (
        <form
          className="writer-link"
          onSubmit={(e) => {
            e.preventDefault()
            if (!link.trim()) {
              editor.chain().focus().unsetLink().run()
              setLink(null)
            } else if (safeWritingLink(link)) {
              editor
                .chain()
                .focus()
                .extendMarkRange('link')
                .setLink({ href: link })
                .run()
              setLink(null)
            } else
              setError(
                'Use a complete http or https link without spaces or credentials.',
              )
          }}
        >
          <label>
            Link address
            <input
              autoFocus
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
              maxLength={2048}
            />
          </label>
          <button type="submit">Apply link</button>
          <button type="button" onClick={() => setLink(null)}>
            Cancel
          </button>
        </form>
      )}
      <EditorContent editor={editor} />
      {error && (
        <p role="alert">
          {error} The last valid document is retained. Undo or remove the
          unsupported content.
        </p>
      )}
      <details className="writer-file-options">
        <summary>Import / export</summary>
        <div className="writer-utilities">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setImportText('')}
          >
            Import Markdown
          </button>
          <button
            type="button"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([editor.getMarkdown()], {
                  type: 'text/markdown;charset=utf-8',
                }),
              )
              const a = document.createElement('a')
              a.href = url
              a.download = 'deardaily-writing.md'
              a.click()
              window.setTimeout(() => URL.revokeObjectURL(url), 1000)
            }}
          >
            Export Markdown
          </button>
          <output>
            {documentText(value).trim().split(/\s+/).filter(Boolean).length}{' '}
            words
          </output>
        </div>
      </details>
      {importText !== null && (
        <div className="markdown-import">
          <label>
            Markdown to append
            <textarea
              value={importText}
              maxLength={100000}
              onChange={(e) => setImportText(e.target.value)}
            />
          </label>
          <p>
            Appends supported Markdown. Tables, HTML and images may lose
            formatting; keep the original file. Underline exports as plain text.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                const parsed = editor.markdown!.parse(importText)
                const next = validateDocument({
                  version: 1,
                  content: {
                    type: 'doc',
                    content: [
                      ...(editor.getJSON().content ?? []),
                      ...(parsed.content ?? []),
                    ],
                  },
                })
                editor
                  .chain()
                  .focus()
                  .insertContentAt(
                    editor.state.doc.content.size,
                    parsed.content ?? [],
                  )
                  .run()
                onChange(next)
                setImportText(null)
                setError('')
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : 'Import could not be validated. Original writing is retained.',
                )
              }
            }}
          >
            Append supported content
          </button>
          <button type="button" onClick={() => setImportText(null)}>
            Cancel import
          </button>
        </div>
      )}
    </div>
  )
}
