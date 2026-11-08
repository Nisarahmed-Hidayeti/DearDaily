export const persistentMusicEnabled =
  import.meta.env.VITE_ENABLE_WRITING_MUSIC === 'true'
export const musicFields = persistentMusicEnabled ? ',music' : ''
export interface StoryMusic {
  provider: 'spotify'
  kind: 'track' | 'album' | 'playlist'
  id: string
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
            ? ['provider', 'kind', 'id', 'share']
            : ['provider', 'kind', 'id']
        ).includes(key),
    ) ||
    m.provider !== 'spotify' ||
    !['track', 'album', 'playlist'].includes(m.kind) ||
    typeof m.id !== 'string' ||
    !/^[A-Za-z0-9]{22}$/.test(m.id) ||
    (privateCopy && typeof m.share !== 'boolean')
  )
    throw Error('Invalid music selection')
  return privateCopy
    ? { provider: 'spotify', kind: m.kind, id: m.id, share: m.share }
    : { provider: 'spotify', kind: m.kind, id: m.id }
}
export function publicMusic(value?: PrivateMusic | null): StoryMusic | null {
  if (!value) return null
  const selected = validateMusic(value, true) as PrivateMusic
  return selected.share
    ? { provider: selected.provider, kind: selected.kind, id: selected.id }
    : null
}
export function musicUrl(value: StoryMusic) {
  const safe = validateMusic(value, 'share' in value)
  return `https://open.spotify.com/${safe.kind}/${safe.id}`
}
