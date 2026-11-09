import { expect, it } from 'vitest'
import { publicMusic, validateMusic } from './music'
const track = {
  provider: 'spotify',
  kind: 'track',
  id: '4uLU6hMCjMI75M1A2tKUQC',
  share: false,
  excerpt: { start: 10, end: 19 },
} as const
it('keeps intended moments private until explicitly shared and strips private preferences', () => {
  expect(publicMusic(track)).toBeNull()
  expect(publicMusic({ ...track, share: true })).toEqual({
    provider: 'spotify',
    kind: 'track',
    id: track.id,
    excerpt: { start: 10, end: 19 },
  })
})
it('rejects unsafe, unbounded and malformed moment metadata', () => {
  for (const excerpt of [
    null,
    {},
    { start: 19, end: 10 },
    { start: 0, end: 86401 },
    { start: -1, end: 10 },
    { start: 1.2, end: 5 },
    { start: 10, end: 19, secret: 'no' },
  ])
    expect(() => validateMusic({ ...track, excerpt }, true)).toThrow()
})
