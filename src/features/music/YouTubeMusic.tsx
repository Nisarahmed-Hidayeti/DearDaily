import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PrivateMusic, StoryMusic } from './music'
import { musicUrl } from './music'
import { spotifyEntity } from './spotify'
import { youtubeVideoId } from './youtube'

type Metadata = { id: string; title: string; author: string }
export function YouTubeMusic({
  value,
  onChange,
  disabled,
  publicCopy,
  playerTarget,
}: {
  value: StoryMusic | PrivateMusic
  onChange?: (value: PrivateMusic | null) => void
  disabled: boolean
  publicCopy: boolean
  playerTarget?: HTMLDivElement | null
}) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [options, setOptions] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null)
  const id = value.id
  const playerId = useId()
  const playerOpen = playingId === id
  const footerPlayer = useRef<HTMLDivElement>(null)
  const [visiblePlayerId, setVisiblePlayerId] = useState<string | null>(null)
  useEffect(() => {
    const slot = footerPlayer.current
    if (!playerOpen || !playerTarget || !slot) return
    slot.scrollIntoView?.({ block: 'center' })
    if (typeof IntersectionObserver === 'undefined') return

    // YouTube requires more than half of the player to be visible before autoplay.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio <= 0.5) return
        setVisiblePlayerId(id)
        observer.disconnect()
      },
      { threshold: 0.51 },
    )
    observer.observe(slot)
    return () => observer.disconnect()
  }, [id, playerOpen, playerTarget])
  const autoplay =
    publicCopy &&
    (playerTarget ? visiblePlayerId === id : playerTarget === undefined)
  useEffect(() => {
    if (publicCopy) return
    const controller = new AbortController()
    // Only the canonical video ID goes to YouTube; never journal text or account credentials.
    void fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      },
    )
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json()
        if (
          !controller.signal.aborted &&
          typeof data.title === 'string' &&
          typeof data.author_name === 'string'
        )
          setMetadata({
            id,
            title: data.title.slice(0, 250),
            author: data.author_name.slice(0, 150),
          })
      })
      .catch(() => {
        /* Unavailable metadata does not prevent official playback. */
      })
    return () => controller.abort()
  }, [id, publicCopy])
  const details = metadata?.id === id ? metadata : null
  const player = (
    <div className="youtube-player" id={playerId}>
      <iframe
        key={id}
        title="YouTube music player"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&playsinline=1`}
        width="100%"
        height="200"
        allow={`${autoplay ? 'autoplay; ' : ''}encrypted-media; picture-in-picture; fullscreen`}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
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
  if (publicCopy) {
    return (
      <section className="story-youtube" aria-label="Story music">
        <button
          type="button"
          className="story-youtube-toggle"
          aria-label={
            playerOpen ? 'Close YouTube player' : 'Play YouTube video'
          }
          aria-expanded={playerOpen}
          aria-controls={playerOpen ? playerId : undefined}
          onClick={() => {
            setVisiblePlayerId(null)
            setPlayingId(playerOpen ? null : id)
          }}
        >
          {failedArtwork !== id && artwork}
          <span className="story-youtube-icon" aria-hidden="true">
            {playerOpen ? '×' : '▶'}
          </span>
        </button>
        {playerOpen &&
          (playerTarget
            ? createPortal(
                <div ref={footerPlayer} className="story-footer-player">
                  {(visiblePlayerId === id ||
                    typeof IntersectionObserver === 'undefined') &&
                    player}
                </div>,
                playerTarget,
              )
            : playerTarget === undefined && player)}
      </section>
    )
  }
  return (
    <section className="writing-music youtube-music" aria-label="Writing music">
      <div
        className={`music-attachment${playerOpen ? ' music-attachment-open' : ''}`}
      >
        {playerOpen ? player : artwork}
        <div className="music-attachment-label">
          <a href={musicUrl(value)} target="_blank" rel="noopener noreferrer">
            {details?.title ?? 'YouTube music'}
          </a>
          <small>{details?.author ?? 'YouTube'}</small>
        </div>
        <button
          type="button"
          className="quiet music-play"
          aria-label={
            playerOpen ? 'Close YouTube player' : 'Play YouTube video'
          }
          aria-expanded={playerOpen}
          aria-controls={playerOpen ? playerId : undefined}
          onClick={() => setPlayingId(playerOpen ? null : id)}
        >
          {playerOpen ? '×' : '▶'}
        </button>
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
      </div>
      {options && onChange && (
        <div className="writing-music-options">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const next = youtubeVideoId(url),
                spotify = spotifyEntity(url)
              if (next)
                onChange({
                  provider: 'youtube',
                  kind: 'video',
                  id: next,
                  share: false,
                })
              else if (spotify) {
                const [, kind, trackId] = spotify.split(':')
                onChange({
                  provider: 'spotify',
                  kind: kind as StoryMusic['kind'],
                  id: trackId,
                  share: false,
                })
              } else {
                setError('Paste a YouTube video or Spotify link.')
                return
              }
              setPlayingId(null)
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
