import { useState } from 'react'
import { availableMoods, moodOptions, type Mood } from './entryMetadata'
export function MoodPicker({
  value,
  onChange,
  disabled = false,
  preview = false,
}: {
  value: Mood
  onChange: (mood: Mood) => void
  disabled?: boolean
  preview?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const options = preview ? moodOptions : availableMoods
  const visible = expanded
    ? options
    : options.filter((m, index) => index < 4 || m[0] === value)
  return (
    <fieldset disabled={disabled} className="mood-picker">
      <legend>How are you feeling?</legend>
      <div className="moods">
        {visible.map(([mood, icon]) => (
          <button
            type="button"
            key={mood}
            aria-pressed={mood === value}
            className={mood === value ? 'selected' : ''}
            onClick={() => onChange(mood)}
          >
            <span aria-hidden="true">{icon}</span>
            {mood}
          </button>
        ))}
      </div>
      {options.length > 4 && (
        <button
          type="button"
          className="quiet mood-more"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Less' : 'More moods'}
        </button>
      )}
    </fieldset>
  )
}
