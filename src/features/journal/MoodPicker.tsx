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
  const options = preview ? moodOptions : availableMoods
  return (
    <fieldset disabled={disabled} className="mood-picker">
      <legend>How are you feeling?</legend>
      <div className="moods">
        {options.map(([mood, icon]) => (
          <button
            type="button"
            key={mood}
            aria-pressed={mood === value}
            className={mood === value ? 'selected' : ''}
            onClick={() => onChange(mood)}
          >
            <span className="mood-symbol" aria-hidden="true">
              {icon}
            </span>
            <span className="mood-label">{mood}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
