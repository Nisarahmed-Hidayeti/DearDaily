import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/core'
import { GripVertical, Plus } from 'lucide-react'
import {
  applyBlock,
  blockCommands,
  currentBlock,
  editBlock,
  menuPosition,
  type BlockCommand,
} from './editorCommands'
export function BlockControls({
  editor,
  disabled,
}: {
  editor: Editor
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [top, setTop] = useState(0)
  const [position, setPosition] = useState({ left: 12, top: 12, width: 280 })
  useEffect(() => {
    const update = () => {
      if (editor.isDestroyed) return
      const b = currentBlock(editor)
      const dom = editor.view.nodeDOM(b.from)
      if (dom instanceof HTMLElement)
        setTop(
          dom.getBoundingClientRect().top -
            editor.view.dom.getBoundingClientRect().top,
        )
    }
    editor.on('selectionUpdate', update)
    editor.on('update', update)
    update()
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('update', update)
    }
  }, [editor])
  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        editor.commands.focus()
      }
    }
    const outside = (e: PointerEvent) => {
      if (!(e.target as Element).closest('.block-actions-menu,.block-handle'))
        setOpen(false)
    }
    document.addEventListener('keydown', close)
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('pointerdown', outside)
    }
  }, [open, editor])
  if (disabled || editor.isDestroyed) return null
  const block = currentBlock(editor)
  return (
    <>
      <div className="block-gutter" style={{ top }}>
        <button
          className="block-handle"
          aria-label="Block actions"
          aria-expanded={open}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            setPosition(menuPosition(e.currentTarget.getBoundingClientRect()))
            setOpen(!open)
          }}
        >
          <GripVertical size={17} />
        </button>
        <button
          aria-label="Add a paragraph after this block"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editBlock(editor, 'add')}
        >
          <Plus size={15} />
        </button>
      </div>
      {open &&
        createPortal(
          <div
            className="block-actions-menu editor-popover"
            role="group"
            aria-label="Current block actions"
            style={position}
          >
            <p className="eyebrow">This block</p>
            <label>
              Convert to
              <select
                aria-label="Convert this block"
                defaultValue=""
                onChange={(e) => {
                  applyBlock(editor, e.target.value as BlockCommand)
                  setOpen(false)
                }}
              >
                <option value="" disabled>
                  Choose a block type
                </option>
                {blockCommands
                  .filter((c) => c.id !== 'divider')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
              </select>
            </label>
            {(['up', 'down', 'duplicate', 'add', 'delete'] as const).map(
              (action) => (
                <button
                  key={action}
                  disabled={
                    (action === 'up' && !block.index) ||
                    (action === 'down' &&
                      block.index === editor.state.doc.childCount - 1)
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editBlock(editor, action)
                    setOpen(false)
                  }}
                >
                  {
                    {
                      up: 'Move up',
                      down: 'Move down',
                      duplicate: 'Duplicate block',
                      add: 'Add paragraph below',
                      delete: 'Delete block',
                    }[action]
                  }
                </button>
              ),
            )}
            <button onClick={() => setOpen(false)}>Close block actions</button>
          </div>,
          document.body,
        )}
    </>
  )
}
