import { spotifyEntity } from './spotify'
export { spotifyEntity } from './spotify'
import { YouTubeMusic } from './YouTubeMusic'
import { youtubeVideoId, youtubeMusicEnabled } from './youtube'
import { studioPolishEnabled } from '../rich-editor/studioPolish'
import { useEffect, useId, useState } from 'react'
import {
  musicUrl,
  validateMusic,
  type PrivateMusic,
  type StoryMusic,
} from './music'

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
  // A different entry must never inherit another entry's loaded soundtrack.
  const selectedEntity = value ? `spotify:${value.kind}:${value.id}` : null
  const activeEntity =
    entity &&
    ((!onChange && !publicCopy && !rawValue) || entity === selectedEntity)
      ? entity
      : null
  useEffect(() => {
    if (!entity || loaded) return
    const timer = window.setTimeout(
      () => setError('Music could not load. Open your selection in Spotify.'),
      15000,
    )
    return () => window.clearTimeout(timer)
  }, [entity, loaded])
  if (value?.provider === 'youtube')
    return (
      <YouTubeMusic
        value={value}
        onChange={onChange}
        disabled={disabled}
        publicCopy={publicCopy}
      />
    )
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
        {value && !activeEntity && !open && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setError('')
              setLoaded(false)
              setEntity(selectedEntity)
              setPlayerVisible(true)
            }}
          >
            Open Spotify player
          </button>
        )}
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
                  const videoId = youtubeMusicEnabled
                    ? youtubeVideoId(url)
                    : null
                  if (videoId && onChange) {
                    onChange({
                      provider: 'youtube',
                      kind: 'video',
                      id: videoId,
                      share: false,
                    })
                    setOpen(false)
                    setEntity(null)
                    return
                  }
                  const next = spotifyEntity(url)
                  if (!next) {
                    setError(
                      youtubeMusicEnabled
                        ? 'Paste a YouTube video or Spotify track, album or playlist link.'
                        : 'Paste a Spotify track, album or playlist link.',
                    )
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
                  {youtubeMusicEnabled
                    ? 'YouTube or Spotify link'
                    : 'Spotify link'}
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
                  {youtubeMusicEnabled ? 'Attach music' : 'Load Spotify player'}
                </button>
              </form>
              {value && value.kind !== 'track' && (
                <small>To keep one song, paste its Spotify track link.</small>
              )}
              {!onChange && (
                <small>Session only · not saved or published.</small>
              )}
            </>
          )}
          {value && (
            <>
              {studioPolishEnabled && onChange && 'share' in value && (
                <fieldset className="music-excerpt">
                  <legend>Intended moment</legend>
                  <p className="tiny muted">
                    Reference only. Spotify controls playback; this does not
                    trim the song.
                  </p>
                  <label>
                    Start (seconds)
                    <input
                      type="number"
                      min="0"
                      max="86399"
                      step="1"
                      value={value.excerpt?.start ?? 0}
                      disabled={disabled}
                      onChange={(e) => {
                        const start = Number(e.target.value)
                        const end = Math.max(
                          start + 1,
                          value.excerpt?.end ?? start + 10,
                        )
                        if (
                          Number.isInteger(start) &&
                          start >= 0 &&
                          end <= 86400
                        )
                          onChange({ ...value, excerpt: { start, end } })
                      }}
                    />
                  </label>
                  <label>
                    End (seconds)
                    <input
                      type="number"
                      min={(value.excerpt?.start ?? 0) + 1}
                      max="86400"
                      step="1"
                      value={value.excerpt?.end ?? 10}
                      disabled={disabled}
                      onChange={(e) => {
                        const end = Number(e.target.value),
                          start = value.excerpt?.start ?? 0
                        if (
                          Number.isInteger(end) &&
                          end > start &&
                          end <= 86400
                        )
                          onChange({ ...value, excerpt: { start, end } })
                      }}
                    />
                  </label>
                  {value.excerpt && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        const next = { ...value }
                        delete next.excerpt
                        onChange(next)
                      }}
                    >
                      Remove moment
                    </button>
                  )}
                </fieldset>
              )}
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
          <small>
            {youtubeMusicEnabled
              ? 'Loads music from its provider.'
              : 'Loads Spotify. Your writing stays private.'}
          </small>
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
      {activeEntity && (
        <small className="music-playback-note">
          Spotify controls preview length. Open Spotify for full playback.
        </small>
      )}
      {value?.excerpt && (
        <small className="music-moment">
          {formatMoment(value.excerpt.start)}–{formatMoment(value.excerpt.end)}{' '}
          · intended moment, not a playback clip
        </small>
      )}
      {error && <p role="alert">{error}</p>}
      {activeEntity && !loaded && !error && (
        <small role="status">Loading music…</small>
      )}
      {activeEntity && (
        <iframe
          id={playerId}
          hidden={!playerVisible}
          key={activeEntity}
          title="Spotify music player"
          src={`https://open.spotify.com/embed/${activeEntity.split(':')[1]}/${activeEntity.split(':')[2]}`}
          width="100%"
          height={152}
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

function formatMoment(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
