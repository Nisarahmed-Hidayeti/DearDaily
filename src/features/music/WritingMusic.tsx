import { useEffect, useId, useState } from 'react'
import {
  musicUrl,
  validateMusic,
  type PrivateMusic,
  type StoryMusic,
} from './music'

export function spotifyEntity(value: string): string | null {
  try {
    const url = new URL(value.trim())
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'open.spotify.com' ||
      url.username ||
      url.password ||
      url.port
    )
      return null
    const match = /^\/(track|album|playlist)\/([A-Za-z0-9]{22})\/?$/.exec(
      url.pathname,
    )
    return match ? `spotify:${match[1]}:${match[2]}` : null
  } catch {
    return null
  }
}

export function WritingMusic({
  value: rawValue,
  onChange,
  publicCopy = false,
  disabled = false,
}: {
  value?: PrivateMusic | StoryMusic | null
  onChange?: (value: PrivateMusic | null) => void
  publicCopy?: boolean
  disabled?: boolean
}) {
  let value: PrivateMusic | StoryMusic | null = null
  try {
    if (rawValue) value = validateMusic(rawValue, !publicCopy)
  } catch {
    // Untrusted or future API formats must not crash the surrounding journal.
  }
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [entity, setEntity] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [playerVisible, setPlayerVisible] = useState(true)
  const playerId = useId()
  useEffect(() => {
    if (!entity || loaded) return
    const timer = window.setTimeout(
      () => setError('Music could not load. Open your selection in Spotify.'),
      15000,
    )
    return () => window.clearTimeout(timer)
  }, [entity, loaded])
  return (
    <section className="writing-music" aria-label="Writing music">
      <div className="row spread">
        <button
          type="button"
          className="text-button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          ♫ Music
        </button>
        {entity && (
          <button
            type="button"
            className="text-button"
            aria-controls={playerId}
            aria-expanded={playerVisible}
            onClick={() => setPlayerVisible(!playerVisible)}
          >
            {playerVisible ? 'Hide player' : 'Show player'}
          </button>
        )}
      </div>
      {open && (
        <div className="writing-music-options">
          {!publicCopy && (
            <>
              <a
                href="https://charts.spotify.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Browse Spotify charts ↗
              </a>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  const next = spotifyEntity(url)
                  if (!next) {
                    setError('Paste a Spotify track, album or playlist link.')
                    return
                  }
                  setError('')
                  if (next !== entity) setLoaded(false)
                  setEntity(next)
                  setPlayerVisible(true)
                  setOpen(false)
                  const [, kind, id] = next.split(':')
                  onChange?.({
                    provider: 'spotify',
                    kind: kind as StoryMusic['kind'],
                    id,
                    share: false,
                  })
                }}
              >
                <label>
                  Spotify link
                  <input
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://open.spotify.com/track/…"
                    required
                    disabled={disabled}
                  />
                </label>
                <button
                  type="submit"
                  className="button secondary"
                  disabled={disabled}
                >
                  Load Spotify player
                </button>
              </form>
              {!onChange && (
                <small>Session only · not saved or published.</small>
              )}
            </>
          )}
          {value && (
            <>
              <a
                href={musicUrl(value)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open selected music in Spotify ↗
              </a>
              {!entity && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setError('')
                    setLoaded(false)
                    setEntity(`spotify:${value.kind}:${value.id}`)
                    setPlayerVisible(true)
                    setOpen(false)
                  }}
                >
                  Load selected music
                </button>
              )}
              {onChange && 'share' in value && (
                <label className="row">
                  <input
                    type="checkbox"
                    checked={value.share}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({ ...value, share: event.target.checked })
                    }
                  />
                  Include music when publishing
                </label>
              )}
            </>
          )}
          <small>Loads Spotify. Your writing stays private.</small>
          {!publicCopy && (entity || (value && onChange)) && (
            <button
              type="button"
              className="text-button"
              disabled={disabled}
              onClick={() => {
                setEntity(null)
                setLoaded(false)
                onChange?.(null)
              }}
            >
              Remove music
            </button>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {entity && !loaded && !error && (
        <small role="status">Loading music…</small>
      )}
      {entity && (
        <iframe
          id={playerId}
          hidden={!playerVisible}
          key={entity}
          title="Spotify music player"
          src={`https://open.spotify.com/embed/${entity.split(':')[1]}/${entity.split(':')[2]}`}
          width="100%"
          height="152"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          allow="encrypted-media"
          onLoad={() => {
            setLoaded(true)
            setError('')
          }}
          onError={() =>
            setError('Music could not load. Open your selection in Spotify.')
          }
        />
      )}
    </section>
  )
}
