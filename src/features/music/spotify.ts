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
