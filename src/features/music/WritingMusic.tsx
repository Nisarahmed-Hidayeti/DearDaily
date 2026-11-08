import { useEffect, useRef, useState } from 'react'
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

type Controller = { togglePlay(): void; destroy(): void }
type SpotifyApi = {
  createController(
    element: HTMLElement,
    options: { uri: string; width: string; height: number },
    callback: (controller: Controller) => void,
  ): void
}
let apiPromise: Promise<SpotifyApi> | undefined
function loadSpotify() {
  if (!apiPromise)
    apiPromise = new Promise<SpotifyApi>((resolve, reject) => {
      const target = window as Window & {
        onSpotifyIframeApiReady?: (api: SpotifyApi) => void
      }
      target.onSpotifyIframeApiReady = resolve
      const script = document.createElement('script')
      script.src = 'https://open.spotify.com/embed/iframe-api/v1'
      script.referrerPolicy = 'no-referrer'
      script.onerror = () => {
        apiPromise = undefined
        script.remove()
        reject(new Error('Spotify unavailable'))
      }
      document.head.append(script)
    })
  return apiPromise
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
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<Controller | null>(null)
  useEffect(() => {
    if (!entity || !host.current) return
    let active = true
    let instance: Controller | undefined
    const timeout = window.setTimeout(() => {
      if (active && !instance)
        setError(
          'Spotify is taking too long. Check your connection or open your music in Spotify.',
        )
    }, 15000)
    void loadSpotify()
      .then((api) => {
        if (!active || !host.current) return
        const mount = document.createElement('div')
        host.current.replaceChildren(mount)
        api.createController(
          mount,
          { uri: entity, width: '100%', height: 152 },
          (value) => {
            instance = value
            if (!active) {
              value.destroy()
              return
            }
            controller.current = value
            window.clearTimeout(timeout)
            setError('')
            setLoaded(true)
          },
        )
      })
      .catch(() => {
        if (active) setError('Spotify could not load. Try again later.')
      })
    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.current = null
      instance?.destroy()
    }
  }, [entity])
  return (
    <section className="writing-music" aria-label="Writing music">
      <button
        type="button"
        className="text-button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {entity || value ? '♫ Soundtrack' : '♫ Add writing music'}
      </button>
      {open && (
        <div className="writing-music-options">
          <p>
            {publicCopy
              ? 'This story includes a Spotify selection approved by its author.'
              : onChange
                ? 'Choose a track, album or playlist. Saved privately with your entry; sharing is a separate choice.'
                : 'Choose a track, album or playlist. Music is for this writing session only; it is not saved or published.'}
          </p>
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
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setError('')
                  const next = `spotify:${value.kind}:${value.id}`
                  if (next !== entity) setLoaded(false)
                  setEntity(next)
                  setOpen(false)
                }}
              >
                Load selected music
              </button>
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
                  Include this Spotify selection in my next public snapshot
                </label>
              )}
            </>
          )}
          <small>
            Loading connects to Spotify, which controls previews, login and
            playback availability. Your writing is never sent. No autoplay.
          </small>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <div ref={host} />
      {(entity || (value && onChange)) && (
        <div className="row">
          <button
            type="button"
            className="button secondary"
            disabled={!loaded}
            onClick={() => controller.current?.togglePlay()}
          >
            Play / pause
          </button>
          <small>
            Focus this button and press Space. Typing is never interrupted.
          </small>
          {!publicCopy && (
            <button
              type="button"
              className="text-button"
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
    </section>
  )
}
