import { useState, type KeyboardEvent } from 'react'
import { emojiCatalog, emojiCategories } from './emojis'
export function EmojiPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState(''),
    [focused, setFocused] = useState(value)
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const choices = emojiCatalog.filter(
    (item) =>
      (!category || category === item.category) &&
      words.every((word) =>
        `${item.emoji} ${item.keywords} ${item.category}`
          .toLowerCase()
          .includes(word),
      ),
  )
  const active = choices.some((v) => v.emoji === focused)
    ? focused
    : choices[0]?.emoji
  const navigate = (e: KeyboardEvent<HTMLDivElement>) => {
    if (
      ![
        'ArrowRight',
        'ArrowLeft',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ].includes(e.key)
    )
      return
    const buttons = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
    )
    const current = buttons.indexOf(e.target as HTMLButtonElement)
    if (current < 0) return
    e.preventDefault()
    const columns = getComputedStyle(e.currentTarget).gridTemplateColumns.split(
      ' ',
    ).length
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? buttons.length - 1
          : Math.max(
              0,
              Math.min(
                buttons.length - 1,
                current +
                  ({
                    ArrowRight: 1,
                    ArrowLeft: -1,
                    ArrowUp: -columns,
                    ArrowDown: columns,
                  }[e.key] ?? 0),
              ),
            )
    buttons[next]?.focus()
  }
  return (
    <fieldset>
      <legend>Page icon · {emojiCatalog.length} choices</legend>
      <input
        type="search"
        aria-label="Search page icons"
        placeholder="Search feelings, coffee, cats, travel…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <label>
        Emoji category
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {emojiCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <div
        className="emoji-grid"
        role="group"
        aria-label="Choose a page icon"
        onKeyDown={navigate}
      >
        {choices.map((item) => (
          <button
            type="button"
            key={item.emoji}
            title={item.keywords}
            aria-label={`Use ${item.emoji}`}
            aria-pressed={value === item.emoji}
            tabIndex={active === item.emoji ? 0 : -1}
            onFocus={() => setFocused(item.emoji)}
            onClick={() => onChange(item.emoji)}
          >
            {item.emoji}
          </button>
        ))}
      </div>
      {!choices.length && <p>No icons found. Try another word or category.</p>}
      <button type="button" className="text-link" onClick={() => onChange('')}>
        Remove icon
      </button>
    </fieldset>
  )
}
