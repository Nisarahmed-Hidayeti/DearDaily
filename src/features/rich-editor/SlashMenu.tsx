import { createPortal } from 'react-dom'
import type { blockCommands } from './editorCommands'
export type SlashState = {
  from: number
  to: number
  query: string
  index: number
  left: number
  top: number
  width: number
}
export function SlashMenu({
  state,
  items,
  onQuery,
  onChoose,
  onKey,
  onClose,
}: {
  state: SlashState
  items: readonly (typeof blockCommands)[number][]
  onQuery: (v: string) => void
  onChoose: (id: (typeof blockCommands)[number]['id']) => void
  onKey: (e: React.KeyboardEvent) => void
  onClose: () => void
}) {
  return createPortal(
    <div
      className="block-picker editor-popover"
      style={{ left: state.left, top: state.top, width: state.width }}
      onKeyDown={onKey}
    >
      <label className="command-search">
        Find a block
        <input
          aria-label="Search block commands"
          value={state.query}
          placeholder="Heading, list, quote…"
          onChange={(e) => onQuery(e.target.value)}
        />
      </label>
      <div
        role="listbox"
        aria-label="Block commands"
        id="writing-block-commands"
      >
        {items.map((item, i) => (
          <button
            key={item.id}
            id={`block-command-${i}`}
            role="option"
            aria-selected={i === state.index}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChoose(item.id)}
          >
            <span>{item.label}</span>
            <small>{item.hint}</small>
          </button>
        ))}
        {!items.length && <p>No matching blocks. Try “list” or “heading”.</p>}
      </div>
      <p className="command-help">
        ↑ ↓ to choose · Enter to insert · Esc to close
      </p>
      <button className="command-close" onClick={onClose}>
        Close block menu
      </button>
    </div>,
    document.body,
  )
}
