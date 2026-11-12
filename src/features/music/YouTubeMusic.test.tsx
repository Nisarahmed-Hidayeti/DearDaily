import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { WritingMusic } from './WritingMusic'
import { youtubeVideoId } from './youtube'
import { musicUrl, publicMusic, validateMusic } from './music'
const selection = {
  provider: 'youtube',
  kind: 'video',
  id: 'M7lc1UVf-VE',
  share: false,
} as const
vi.mock('./youtube', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./youtube')>()),
  youtubeMusicEnabled: true,
}))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
it('accepts only HTTPS individual video links and discards playlist and tracking parameters', () => {
  for (const url of [
    'https://youtu.be/M7lc1UVf-VE?si=test',
    'https://music.youtube.com/watch?v=M7lc1UVf-VE&list=private-list',
    'https://www.youtube.com/shorts/M7lc1UVf-VE',
  ])
    expect(youtubeVideoId(url)).toBe(selection.id)
  for (const url of [
    'http://youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtube.com.evil.com/watch?v=M7lc1UVf-VE',
    'https://user@youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtube.com/playlist?list=abc',
    'javascript:alert(1)',
    'https://youtu.be/invalid',
  ])
    expect(youtubeVideoId(url)).toBeNull()
})
it('validates saved snapshots and retains explicit sharing without private preferences', () => {
  expect(validateMusic(selection, true)).toEqual(selection)
  expect(publicMusic(selection)).toBeNull()
  expect(publicMusic({ ...selection, share: true })).toEqual({
    provider: 'youtube',
    kind: 'video',
    id: selection.id,
  })
  expect(musicUrl(selection)).toBe(
    'https://www.youtube.com/watch?v=' + selection.id,
  )
  for (const bad of [
    { ...selection, id: '<script>' },
    { ...selection, kind: 'playlist' },
    { ...selection, excerpt: { start: 0, end: 10 } },
    { ...selection, title: 'unreviewed' },
  ])
    expect(() => validateMusic(bad, true)).toThrow()
})
it('loads permitted metadata safely and reveals a visible official non-autoplay player only on interaction', async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      title: 'A synthetic song',
      author_name: 'Test channel',
      html: '<script>unsafe</script>',
    }),
  })
  vi.stubGlobal('fetch', fetcher)
  const { rerender } = render(
    <WritingMusic value={selection} onChange={() => {}} />,
  )
  expect(document.querySelector('iframe')).toBeNull()
  expect(await screen.findByText('A synthetic song')).toBeVisible()
  expect(fetcher.mock.calls[0][0]).toContain('www.youtube.com/oembed?url=')
  expect(document.querySelector('script')).toBeNull()
  await userEvent.click(
    screen.getByRole('button', { name: 'Play YouTube video' }),
  )
  const player = screen.getByTitle('YouTube music player')
  expect(player).toHaveAttribute(
    'src',
    `https://www.youtube-nocookie.com/embed/${selection.id}?autoplay=0&playsinline=1`,
  )
  expect(player).toBeVisible()
  rerender(
    <WritingMusic value={{ ...selection, share: true }} onChange={() => {}} />,
  )
  expect(screen.getByTitle('YouTube music player')).toBe(player)
  rerender(
    <WritingMusic
      value={{ ...selection, id: 'dQw4w9WgXcQ' }}
      onChange={() => {}}
    />,
  )
  expect(screen.queryByTitle('YouTube music player')).toBeNull()
  await waitFor(() =>
    expect(screen.queryByText('A synthetic song')).not.toBeNull(),
  )
})
it('attaches a normalized selection without inheriting old sharing consent', async () => {
  const onChange = vi.fn()
  render(<WritingMusic onChange={onChange} />)
  await userEvent.click(screen.getByRole('button', { name: '♫ Music' }))
  await userEvent.type(
    screen.getByLabelText('YouTube or Spotify link'),
    'https://music.youtube.com/watch?v=M7lc1UVf-VE&list=ignored',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Attach music' }))
  expect(onChange).toHaveBeenCalledWith(selection)
})
it('public readers have playback but no mutation or sharing controls when metadata is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unavailable')))
  render(
    <WritingMusic
      publicCopy
      value={{ provider: 'youtube', kind: 'video', id: selection.id }}
    />,
  )
  expect(screen.queryByRole('button', { name: 'Music options' })).toBeNull()
  expect(screen.queryByRole('checkbox')).toBeNull()
  await userEvent.click(
    screen.getByRole('button', { name: 'Play YouTube video' }),
  )
  expect(screen.getByTitle('YouTube music player')).toBeVisible()
  expect(screen.queryByRole('link')).toBeNull()
  expect(screen.queryByText('YouTube music')).toBeNull()
  await userEvent.click(
    screen.getByRole('button', { name: 'Close YouTube player' }),
  )
  expect(screen.queryByTitle('YouTube music player')).toBeNull()
})
