import type { Editor } from '@tiptap/core'
import { Selection } from '@tiptap/pm/state'
import { closeHistory } from '@tiptap/pm/history'
export interface DropIndicator {
  left: number
  top: number
  width: number
}
/** One transaction keeps moved blocks, marks and undo history intact. */
export function moveBlockTo(editor: Editor, source: number, boundary: number) {
  const { doc } = editor.state
  if (
    !Number.isInteger(source) ||
    !Number.isInteger(boundary) ||
    source < 0 ||
    source >= doc.childCount ||
    boundary < 0 ||
    boundary > doc.childCount ||
    boundary === source ||
    boundary === source + 1
  )
    return false
  let from = 0,
    target = 0
  for (let i = 0; i < doc.childCount; i++) {
    if (i < source) from += doc.child(i).nodeSize
    if (i < boundary) target += doc.child(i).nodeSize
  }
  const node = doc.child(source),
    tr = editor.state.tr.delete(from, from + node.nodeSize)
  const destination = tr.mapping.map(target)
  tr.insert(destination, node)
  tr.setSelection(
    Selection.near(
      tr.doc.resolve(Math.min(destination + 1, tr.doc.content.size)),
    ),
  )
  editor.view.dispatch(closeHistory(tr))
  return true
}
/** Pointer dragging works for mouse and touch without exporting private block contents. */
export function startBlockDrag(
  editor: Editor,
  button: HTMLButtonElement,
  start: { x: number; y: number; pointerId: number },
  source: number,
  indicate: (value: DropIndicator | null) => void,
  finish: (moved: boolean, attempted: boolean) => void,
) {
  const snapshot = editor.state.doc
  let boundary = source,
    active = false,
    done = false
  button.setPointerCapture(start.pointerId)
  const cleanup = () => {
    if (done) return
    done = true
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('keydown', key, true)
    if (button.hasPointerCapture(start.pointerId))
      button.releasePointerCapture(start.pointerId)
    indicate(null)
  }
  const cancel = () => {
    cleanup()
    finish(false, active)
  }
  const move = (event: PointerEvent) => {
    if (event.pointerId !== start.pointerId || editor.isDestroyed) return
    if (
      !active &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6
    )
      return
    active = true
    event.preventDefault()
    const nodes = Array.from(editor.view.dom.children).filter(
      (n): n is HTMLElement => n instanceof HTMLElement,
    )
    boundary = nodes.findIndex((n) => {
      const r = n.getBoundingClientRect()
      return event.clientY < r.top + r.height / 2
    })
    if (boundary < 0) boundary = nodes.length
    const rect = editor.view.dom.getBoundingClientRect(),
      next = nodes[boundary]?.getBoundingClientRect(),
      last = nodes.at(-1)?.getBoundingClientRect()
    indicate({
      left: rect.left,
      top: next?.top ?? last?.bottom ?? rect.top,
      width: rect.width,
    })
  }
  const up = (event: PointerEvent) => {
    if (event.pointerId !== start.pointerId) return
    const moved =
      active &&
      !editor.isDestroyed &&
      editor.state.doc === snapshot &&
      moveBlockTo(editor, source, boundary)
    cleanup()
    finish(!!moved, active)
  }
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancel()
    }
  }
  window.addEventListener('pointermove', move, { passive: false })
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', cancel)
  window.addEventListener('keydown', key, true)
  return cleanup
}
