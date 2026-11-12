import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PrivateMusic, StoryMusic } from './music'
import { YouTubePlayer, type YouTubePlayback } from './YouTubePlayer'
import { youtubeVideoId } from './youtube'

export function YouTubeMusic({
  value,
  onChange,
  disabled,
  publicCopy,
}: {
  value: StoryMusic | PrivateMusic
  onChange?: (value: PrivateMusic | null) => void
  disabled: boolean
  publicCopy: boolean
}) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [options, setOptions] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const id = value.id
  const playerId = useId()
  const playback = useRef<YouTubePlayback>(null)
  const playerOpen = playingId === id
  function closePlayer() {
    setPlayingId(null)
    setPlaying(false)
  }
  useEffect(() => {
    if (!playerOpen) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) closePlayer()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [playerOpen])
  function togglePlayer() {
    if (!playerOpen) {
      setPlaying(false)
      setPlayingId(id)
    } else if (playing) {
      playback.current?.pauseVideo()
    } else {
      playback.current?.playVideo()
    }
  }
  const artwork =
    failedArtwork === id ? (
      <span className="music-artwork-fallback" aria-hidden="true">
        ♫
      </span>
    ) : (
      <img
        onError={() => setFailedArtwork(id)}
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        width="72"
        height="56"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    )
  return (
    <section
      className={publicCopy ? 'story-youtube' : 'story-youtube editor-youtube'}
      aria-label="Story music"
    >
      <button
        type="button"
        className="story-youtube-toggle"
        data-playing={playerOpen && playing}
        aria-label={
          playerOpen && playing ? 'Pause YouTube video' : 'Play YouTube video'
        }
        aria-controls={playerOpen ? playerId : undefined}
        onClick={togglePlayer}
      >
        {failedArtwork !== id && artwork}
        <span className="story-youtube-icon" aria-hidden="true">
          {playerOpen && playing ? '❚❚' : '▶'}
        </span>
      </button>
      {playerOpen &&
        createPortal(
          <aside className="story-player-dock" aria-label="YouTube playback">
            <button
              type="button"
              className="quiet story-player-close"
              aria-label="Close video panel"
              onClick={closePlayer}
            >
              ×
            </button>
            <YouTubePlayer
              id={id}
              playerId={playerId}
              onPlaying={setPlaying}
              playback={playback}
            />
          </aside>,
          document.body,
        )}
      {onChange && (
        <button
          type="button"
          className="quiet"
          aria-label="Music options"
          aria-expanded={options}
          onClick={() => setOptions(!options)}
        >
          ⋯
        </button>
      )}
      {options && onChange && (
        <div className="writing-music-options">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const next = youtubeVideoId(url)
              if (!next) {
                setError('Paste a YouTube video link.')
                return
              }
              onChange({
                provider: 'youtube',
                kind: 'video',
                id: next,
                share: false,
              })
              setPlayingId(null)
              setPlaying(false)
              setOptions(false)
              setError('')
            }}
          >
            <label>
              Change music
              <input
                type="url"
                value={url}
                disabled={disabled}
                onChange={(event) => setUrl(event.target.value)}
                required
              />
            </label>
            <button className="button secondary" disabled={disabled}>
              Attach music
            </button>
          </form>
          {'share' in value && (
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
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Remove music
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </section>
  )
}
