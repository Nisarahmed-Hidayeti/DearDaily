export const persistentMusicEnabled =
  import.meta.env.VITE_ENABLE_WRITING_MUSIC === 'true'
export const musicFields = persistentMusicEnabled ? ',music' : ''
export interface StoryMusic {
  provider: 'spotify' | 'youtube'
  kind: 'track' | 'album' | 'playlist' | 'video'
  id: string
  excerpt?: { start: number; end: number }
}
export interface PrivateMusic extends StoryMusic {
  share: boolean
}
export function validateMusic(
  value: unknown,
  privateCopy = false,
): StoryMusic | PrivateMusic {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid music selection')
  const m = value as PrivateMusic
  if (
    Object.keys(m).some(
      (key) =>
        !(
          privateCopy
            ? ['provider', 'kind', 'id', 'share', 'excerpt']
            : ['provider', 'kind', 'id', 'excerpt']
        ).includes(key),
    ) ||
    typeof m.id !== 'string' ||
    !(m.provider === 'spotify'
      ? ['track', 'album', 'playlist'].includes(m.kind) &&
        /^[A-Za-z0-9]{22}$/.test(m.id)
      : m.provider === 'youtube' &&
        m.kind === 'video' &&
        /^[A-Za-z0-9_-]{11}$/.test(m.id) &&
        m.excerpt === undefined) ||
    (privateCopy && typeof m.share !== 'boolean')
  )
    throw Error('Invalid music selection')
  const excerpt = m.excerpt
  if (
    excerpt !== undefined &&
    (!excerpt ||
      typeof excerpt !== 'object' ||
      Array.isArray(excerpt) ||
      Object.keys(excerpt).some((k) => !['start', 'end'].includes(k)) ||
      !Number.isInteger(excerpt.start) ||
      !Number.isInteger(excerpt.end) ||
      excerpt.start < 0 ||
      excerpt.end <= excerpt.start ||
      excerpt.end > 86400)
  )
    throw Error('Invalid intended music excerpt')
  const selection: StoryMusic = {
    provider: m.provider,
    kind: m.kind,
    id: m.id,
    ...(excerpt ? { excerpt: { start: excerpt.start, end: excerpt.end } } : {}),
  }
  return privateCopy ? { ...selection, share: m.share } : selection
}
export function publicMusic(value?: PrivateMusic | null): StoryMusic | null {
  if (!value) return null
  const selected = validateMusic(value, true) as PrivateMusic
  return selected.share
    ? {
        provider: selected.provider,
        kind: selected.kind,
        id: selected.id,
        ...(selected.excerpt ? { excerpt: selected.excerpt } : {}),
      }
    : null
}
export function musicUrl(value: StoryMusic) {
  const safe = validateMusic(value, 'share' in value)
  return safe.provider === 'youtube'
    ? `https://www.youtube.com/watch?v=${safe.id}`
    : `https://open.spotify.com/${safe.kind}/${safe.id}`
}
