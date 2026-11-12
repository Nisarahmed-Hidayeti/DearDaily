import { useState } from 'react'
import { YouTubeMusic } from './YouTubeMusic'
import { youtubeVideoId, youtubeMusicEnabled } from './youtube'
import { validateMusic, type PrivateMusic, type StoryMusic } from './music'

export function WritingMusic({
  value: rawValue,
  onChange,
  publicCopy = false,
  playerTarget,
  disabled = false,
}: {
  value?: PrivateMusic | StoryMusic | null
  onChange?: (value: PrivateMusic | null) => void
  publicCopy?: boolean
  playerTarget?: HTMLDivElement | null
  disabled?: boolean
}) {
  let value: PrivateMusic | StoryMusic | null = null
  try {
    if (rawValue) value = validateMusic(rawValue, !publicCopy)
  } catch {
    // Ignore unrecognized attachments without affecting the journal.
  }
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  if (value?.provider === 'youtube') {
    return (
      <YouTubeMusic
        value={value}
        onChange={onChange}
        disabled={disabled}
        publicCopy={publicCopy}
        playerTarget={playerTarget}
      />
    )
  }
  if (publicCopy || !onChange || !youtubeMusicEnabled) return null

  return (
    <section className="writing-music" aria-label="Writing music">
      <button
        type="button"
        className="text-button"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        ♫ Music
      </button>
      {open && (
        <div className="writing-music-options">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (disabled) return
              const id = youtubeVideoId(url)
              if (!id) {
                setError('Paste a YouTube video link.')
                return
              }
              onChange({ provider: 'youtube', kind: 'video', id, share: false })
              setUrl('')
              setOpen(false)
              setError('')
            }}
          >
            <label>
              YouTube link
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://youtu.be/…"
                required
                disabled={disabled}
              />
            </label>
            <button className="button secondary" disabled={disabled}>
              Attach music
            </button>
          </form>
          {value && (
            <button
              type="button"
              className="text-button"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              Remove old attachment
            </button>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </section>
  )
}
