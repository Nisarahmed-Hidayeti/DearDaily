import { useEffect, useRef } from 'react'

type Player = {
  getPlayerState(): number
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
  useEffect(() => {
    const container = host.current
    if (!container) return
    let active = true
    let player: Player | undefined
    const iframe = document.createElement('iframe')
    iframe.title = 'YouTube music player'
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&controls=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
    iframe.allowFullscreen = true
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'
    container.append(iframe)
    void loadPlayerApi().then((Player) => {
      if (!active || !Player) return
      player = new Player(iframe, {
        events: {
          onReady: ({ target }) => {
            if (active) onPlaying(target.getPlayerState() === 1)
          },
          onStateChange: ({ data }) => {
            if (active) onPlaying(data === 1)
          },
        },
      })
    })
    return () => {
      active = false
      player?.destroy()
      iframe.remove()
    }
  }, [id, onPlaying])
  return <div className="youtube-player" id={playerId} ref={host} />
}
