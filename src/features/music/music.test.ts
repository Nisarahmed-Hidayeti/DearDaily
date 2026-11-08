import { expect, it } from 'vitest'
import {
  musicUrl,
  publicMusic,
  validateMusic,
  type PrivateMusic,
} from './music'
const selected: PrivateMusic = {
  provider: 'spotify',
  kind: 'track',
  id: '4uLU6hMCjMI75M1A2tKUQC',
  share: false,
}
it('never includes private music without explicit approval and strips the private flag', () => {
  expect(publicMusic(selected)).toBeNull()
  expect(publicMusic({ ...selected, share: true })).toEqual({
    provider: 'spotify',
    kind: 'track',
    id: selected.id,
  })
  expect(selected.share).toBe(false)
  expect(musicUrl(selected)).toBe(
    'https://open.spotify.com/track/' + selected.id,
  )
})
it('rejects scripts, unknown fields, missing approval and unsupported providers', () => {
  for (const value of [
    { ...selected, id: 'javascript:alert(1)' },
    { ...selected, provider: 'other' },
    { ...selected, secret: 'hidden' },
    { provider: 'spotify', kind: 'track', id: selected.id },
    [],
  ])
    expect(() => validateMusic(value, true)).toThrow()
  expect(() => validateMusic(selected)).toThrow()
})
it('keeps the public object independent from later private changes', () => {
  const privateSelection = { ...selected, share: true }
  const snapshot = publicMusic(privateSelection)
  privateSelection.id = '4uLU6hMCjMI75M1A2tKUQD'
  privateSelection.share = false
  expect(snapshot?.id).toBe(selected.id)
  expect(publicMusic(privateSelection)).toBeNull()
})
