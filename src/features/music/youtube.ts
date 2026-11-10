/** Only individual videos are accepted; playlist context is deliberately discarded. */
export function youtubeVideoId(input: string): string | null {
  try {
    const url = new URL(input.trim())
    if (url.protocol !== 'https:' || url.username || url.password || url.port)
      return null
    let id: string | null = null
    if (url.hostname === 'youtu.be')
      id = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null
    else if (
      [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'music.youtube.com',
      ].includes(url.hostname)
    )
      id =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : (/^\/(?:shorts|embed)\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null)
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}
export const youtubeMusicEnabled =
  import.meta.env.VITE_ENABLE_YOUTUBE_MUSIC === 'true'
