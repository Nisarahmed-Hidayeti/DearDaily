import { useEffect, useRef, useState } from 'react'

type Player = {
  getPlayerState(): number
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  destroy(): void
}

type PlayerConstructor = new (
  iframe: HTMLIFrameElement,
  options: {
    events: {
      onReady(event: { target: Player }): void
      onStateChange(event: { data: number }): void
    }
  },
) => Player

type YouTubeWindow = Window & {
  YT?: { Player?: PlayerConstructor }
  onYouTubeIframeAPIReady?: () => void
}

let api: Promise<PlayerConstructor | undefined> | undefined

function loadPlayerApi() {
  const youtube = window as YouTubeWindow
  if (youtube.YT?.Player) return Promise.resolve(youtube.YT.Player)
  api ??= new Promise((resolve) => {
    const script = document.createElement('script')
    const previous = youtube.onYouTubeIframeAPIReady
    youtube.onYouTubeIframeAPIReady = () => {
      resolve(youtube.YT?.Player)
      previous?.()
    }
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => {
      api = undefined
      youtube.onYouTubeIframeAPIReady = previous
      script.remove()
      resolve(undefined)
    }
    document.head.append(script)
  })
  return api
}

export function YouTubePlayer({
  id,
  playerId,
  onPlaying,
}: {
  id: string
  playerId: string
  onPlaying: (playing: boolean) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const playback = useRef<Player | null>(null)
  const [progress, setProgress] = useState({ time: 0, duration: 0 })
  useEffect(() => {
    const container = host.current
    if (!container) return
    let active = true
    let player: Player | undefined
    let timer: number | undefined
    function updateProgress() {
      const ready = playback.current
      if (!ready) return
      const duration = ready.getDuration()
      const time = ready.getCurrentTime()
      if (Number.isFinite(duration) && duration > 0 && Number.isFinite(time)) {
        setProgress({ duration, time: Math.max(0, Math.min(time, duration)) })
      }
    }
    function updatePlayback(state: number) {
      const playing = state === 1
      onPlaying(playing)
      updateProgress()
      window.clearInterval(timer)
      if (playing) timer = window.setInterval(updateProgress, 250)
    }
    const iframe = document.createElement('iframe')
    iframe.title = 'YouTube music player'
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&controls=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
    iframe.allowFullscreen = true
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'
    container.append(iframe)
    void loadPlayerApi().then((Player) => {
      if (!active || !Player) return
      player = new Player(iframe, {
        events: {
          onReady: ({ target }) => {
            if (!active) return
            playback.current = target
            updatePlayback(target.getPlayerState())
          },
          onStateChange: ({ data }) => {
            if (active) updatePlayback(data)
          },
        },
      })
    })
    return () => {
      active = false
      window.clearInterval(timer)
      playback.current = null
      player?.destroy()
      iframe.remove()
    }
  }, [id, onPlaying])
  return (
    <div className="youtube-player" id={playerId}>
      <div ref={host} />
      {progress.duration > 0 && (
        <input
          type="range"
          className="youtube-progress"
          aria-label="YouTube playback position"
          min={0}
          max={progress.duration}
          step="any"
          value={progress.time}
          onChange={(event) => {
            const time = event.target.valueAsNumber
            if (!Number.isFinite(time)) return
            playback.current?.seekTo(time, true)
            setProgress({ ...progress, time })
          }}
        />
      )}
    </div>
  )
}
