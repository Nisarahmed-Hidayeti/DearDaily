import { BlockControls } from './BlockControls'
import { SlashMenu, type SlashState } from './SlashMenu'
import {
  applyBlock,
  blockCommands,
  menuPosition,
  type BlockCommand,
} from './editorCommands'
import { parseMarkdown, serializeMarkdown } from './markdownBridge'
import { writingExtensions } from './extensions'
import { LoadingState } from '../../components/Shared'
import { useEffect, useState, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { documentText, safeWritingLink, validateDocument } from './document'
import type { WritingDocument } from './document'
import './writer.css'

function ValidatedRichWriter({
  value,
  onChange,
  disabled = false,
  onUpload,
}: {
  value: WritingDocument
  onChange: (value: WritingDocument) => void
  disabled?: boolean
  onUpload?: (file: File) => Promise<string>
}) {
  const [error, setError] = useState('')
  const [markdownBusy, setMarkdownBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null),
    pendingPhoto = useRef<{ from: number; to: number } | null>(null)
  const [slash, setSlashState] = useState<SlashState | null>(null)
  const slashRef = useRef<SlashState | null>(null)
  const setSlash = (next: SlashState | null) => {
    slashRef.current = next
    setSlashState(next)
  }
  const filtered = (query: string) =>
    blockCommands.filter((c) =>
      (c.label + ' ' + c.keywords).toLowerCase().includes(query.toLowerCase()),
    )
  const syncSlash = (current: import('@tiptap/core').Editor) => {
    const { $from } = current.state.selection
    const before = $from.parent.textBetween(0, $from.parentOffset, '', '')
    const match = before.match(/(?:^|\s)\/([a-z0-9 ]*)$/i)
    if (!match || !current.state.selection.empty) {
      if (slashRef.current) setSlash(null)
      return
    }
    const from = $from.pos - match[1].length - 1
    const coords = current.view.coordsAtPos($from.pos)
    setSlash({
      from,
      to: $from.pos,
      query: match[1],
      index: slashRef.current?.query === match[1] ? slashRef.current.index : 0,
      ...menuPosition(coords),
    })
  }
  const choose = (current: import('@tiptap/core').Editor, id: BlockCommand) => {
    const range = slashRef.current
    setSlash(null)
    if (id === 'image') {
      if (!onUpload) {
        setError(
          'Save the entry first. Photo upload also requires approved private Storage setup.',
        )
        return
      }
      pendingPhoto.current = range ?? {
        from: current.state.selection.to,
        to: current.state.selection.to,
      }
      fileInput.current?.click()
      return
    }
    applyBlock(current, id, range ?? undefined)
  }
  const [importText, setImportText] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const editorRef = useRef<import('@tiptap/core').Editor | null>(null)
  const editor = useEditor({
    extensions: writingExtensions(),
    content: value.content,
    editable: !disabled,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Journal body',
        'aria-multiline': 'true',
        spellcheck: 'true',
        'aria-autocomplete': 'list',
        'aria-controls': 'writing-block-commands',
        'aria-expanded': slash ? 'true' : 'false',
        'aria-activedescendant': slash ? `block-command-${slash.index}` : '',
      },
      handlePaste: (_view, event) => {
        const photo = event.clipboardData?.files?.[0]
        if (!photo) return false
        if (onUpload) {
          event.preventDefault()
          void addPhoto(photo)
          return true
        }
        return false
      },
      handleDrop: (_view, event) => {
        const photo = event.dataTransfer?.files?.[0]
        if (!photo) return false
        if (onUpload) {
          event.preventDefault()
          void addPhoto(photo)
          return true
        }
        return false
      },
      handleKeyDown: (_view, event) => {
        const menu = slashRef.current
        if (menu) {
          const items = filtered(menu.query)
          if (event.key === 'Escape') {
            setSlash(null)
            event.preventDefault()
            return true
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            setSlash({
              ...menu,
              index: items.length
                ? (menu.index +
                    (event.key === 'ArrowDown' ? 1 : -1) +
                    items.length) %
                  items.length
                : 0,
            })
            event.preventDefault()
            return true
          }
          if (event.key === 'Enter') {
            const choice = items[menu.index]
            if (choice && editorRef.current)
              choose(editorRef.current, choice.id)
            event.preventDefault()
            return true
          }
        }
        return false
      },
    },
    onSelectionUpdate: ({ editor: current }) => {
      if (slashRef.current && current.view.hasFocus()) syncSlash(current)
    },
    onUpdate: ({ editor: current }) => {
      syncSlash(current)
      if (disabled) return
      try {
        onChange(
          validateDocument({
            ...value,
            version: 1,
            content: current.getJSON(),
          }),
        )
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
    editorRef.current = editor
    return () => {
      editorRef.current = null
    }
  }, [editor])
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
  useEffect(() => {
    const close = () => setSlash(null)
    const outside = (event: PointerEvent) => {
      const target = event.target
      if (
        target instanceof Element &&
        !target.closest('.block-picker, .ProseMirror')
      )
        close()
    }
    const reposition = () => {
      const current = editorRef.current,
        menu = slashRef.current
      if (!current || current.isDestroyed || !menu) return
      setSlash({
        ...menu,
        ...menuPosition(current.view.coordsAtPos(current.state.selection.to)),
      })
    }
    const scroll = (event: Event) => {
      if (!(
        event.target instanceof Element && event.target.closest('.block-picker')
      ))
        reposition()
    }
    window.addEventListener('resize', reposition)
    document.addEventListener('scroll', scroll, true)
    document.addEventListener('pointerdown', outside)
    return () => {
      window.removeEventListener('resize', reposition)
      document.removeEventListener('scroll', scroll, true)
      document.removeEventListener('pointerdown', outside)
    }
  }, [])
  if (!editor) return <LoadingState>Preparing your writing space…</LoadingState>
  async function addPhoto(file: File) {
    if (!editor || editor.isDestroyed || !onUpload || uploading) return
    let range = pendingPhoto.current ?? {
      from: editor.state.selection.to,
      to: editor.state.selection.to,
    }
    pendingPhoto.current = null
    const expected = editor.state.doc.textBetween(range.from, range.to)
    const map = ({
      transaction,
    }: {
      transaction: import('@tiptap/pm/state').Transaction
    }) => {
      range = {
        from: transaction.mapping.map(range.from, 1),
        to: transaction.mapping.map(range.to, 1),
      }
    }
    editor.on('transaction', map)
    setUploading(true)
    try {
      const id = await onUpload(file)
      if (editor.isDestroyed) return
      if (editor.state.doc.textBetween(range.from, range.to) !== expected)
        range = { from: range.to, to: range.to }
      const inserted = editor.commands.insertContentAt(
        range,
        {
          type: 'journalImage',
          attrs: {
            assetId: id,
            publicId: null,
            alt: '',
            width: 'wide',
            align: 'center',
          },
        },
        { updateSelection: false },
      )
      if (!inserted)
        throw Error(
          'Photo uploaded, but insertion was not confirmed. Your writing is unchanged.',
        )
    } catch (e) {
      if (!editor.isDestroyed)
        setError(
          e instanceof Error
            ? e.message
            : 'Photo upload failed. Existing writing is unchanged.',
        )
    } finally {
      editor.off('transaction', map)
      if (!editor.isDestroyed) setUploading(false)
    }
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
    <div
      className="rich-writer"
      onMouseDown={(event) => {
        if ((event.target as Element).closest('button')) event.preventDefault()
      }}
    >
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
            aria-expanded={!!slash}
            onClick={() => {
              if (slash) setSlash(null)
              else {
                const pos = editor.state.selection.from
                setSlash({
                  from: pos,
                  to: pos,
                  query: '',
                  index: 0,
                  ...menuPosition(editor.view.coordsAtPos(pos)),
                })
              }
            }}
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
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        aria-label="Upload a private photo"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void addPhoto(file)
          event.target.value = ''
        }}
      />
      {uploading && (
        <LoadingState>Preparing and uploading your private photo…</LoadingState>
      )}
      <BlockControls editor={editor} disabled={disabled} />
      {slash && (
        <SlashMenu
          state={slash}
          items={filtered(slash.query)}
          onQuery={(query) => setSlash({ ...slash, query, index: 0 })}
          onChoose={(id) => choose(editor, id)}
          onClose={() => {
            setSlash(null)
            editor.commands.focus()
          }}
          onKey={(event) => {
            const items = filtered(slash.query)
            if (event.key === 'Escape') {
              event.preventDefault()
              setSlash(null)
              editor.commands.focus()
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setSlash({
                ...slash,
                index: items.length
                  ? (slash.index +
                      (event.key === 'ArrowDown' ? 1 : -1) +
                      items.length) %
                    items.length
                  : 0,
              })
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              if (items[slash.index]) choose(editor, items[slash.index].id)
            }
          }}
        />
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
            disabled={!onUpload || uploading}
            onClick={() => {
              pendingPhoto.current = null
              fileInput.current?.click()
            }}
          >
            Add private photo
          </button>
          {!onUpload && (
            <small>
              Save the entry first; private photo setup must also be approved.
            </small>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setImportText('')}
          >
            Import Markdown
          </button>
          <button
            type="button"
            disabled={markdownBusy}
            onClick={async () => {
              setMarkdownBusy(true)
              try {
                const markdown = await serializeMarkdown(editor.getJSON())
                const url = URL.createObjectURL(
                  new Blob([markdown], {
                    type: 'text/markdown;charset=utf-8',
                  }),
                )
                const a = document.createElement('a')
                a.href = url
                a.download = 'deardaily-writing.md'
                a.click()
                window.setTimeout(() => URL.revokeObjectURL(url), 1000)
              } catch {
                setError(
                  'Markdown export failed. Your saved writing is unchanged.',
                )
              } finally {
                setMarkdownBusy(false)
              }
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
            Photos export as labeled placeholders, without private links.
          </p>
          <button
            type="button"
            disabled={markdownBusy}
            onClick={async () => {
              setMarkdownBusy(true)
              try {
                const parsed = await parseMarkdown(importText)
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
                onChange({ ...value, content: next.content })
                setImportText(null)
                setError('')
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : 'Import could not be validated. Original writing is retained.',
                )
              } finally {
                setMarkdownBusy(false)
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

export function RichWriter(props: Parameters<typeof ValidatedRichWriter>[0]) {
  let safe: WritingDocument | null = null
  try {
    safe = validateDocument(props.value)
  } catch {
    /* Preserve unsupported data; do not mount an editor that rewrites it. */
  }
  if (!safe)
    return (
      <div role="alert" className="auth-notice">
        This document uses unsupported content. Your saved data has not been
        replaced. Export your account data before restoring it with a supported
        editor.
      </div>
    )
  return <ValidatedRichWriter {...props} value={safe} />
}
