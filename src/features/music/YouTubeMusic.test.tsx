import { render, screen, cleanup, act, within } from '@testing-library/react'
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
it('starts only after a click and keeps the player mounted during editor changes', async () => {
  const { rerender } = render(
    <WritingMusic value={selection} onChange={() => {}} />,
  )
  expect(screen.queryByTitle('YouTube music player')).toBeNull()
  await userEvent.click(
    screen.getByRole('button', { name: 'Play YouTube video' }),
  )
  const player = screen.getByTitle('YouTube music player')
  expect(player).toHaveAttribute('src', expect.stringContaining('autoplay=1'))
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
})
it('attaches a normalized selection without inheriting old sharing consent', async () => {
  const onChange = vi.fn()
  render(<WritingMusic onChange={onChange} />)
  await userEvent.click(screen.getByRole('button', { name: 'Add music' }))
  await userEvent.type(
    screen.getByLabelText('YouTube link'),
    'https://music.youtube.com/watch?v=M7lc1UVf-VE&list=ignored',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Attach music' }))
  expect(onChange).toHaveBeenCalledWith(selection)
})
it('opens the editor player outside the page and spins only during confirmed playback', async () => {
  const destroy = vi.fn()
  let reportState: (data: number) => void = () => {}
  vi.stubGlobal('YT', {
    Player: class {
      constructor(
        _iframe: HTMLIFrameElement,
        {
          events,
        }: {
          events: { onStateChange: (event: { data: number }) => void }
        },
      ) {
        reportState = (data) => events.onStateChange({ data })
      }
      destroy = destroy
    },
  })
  const { container } = render(<WritingMusic value={selection} />)
  const disc = screen.getByRole('button', { name: 'Play YouTube video' })
  await userEvent.click(disc)
  const dock = screen.getByRole('complementary', { name: 'YouTube playback' })
  expect(container).not.toContainElement(dock)
  expect(within(dock).getByTitle('YouTube music player')).toHaveAttribute(
    'src',
    expect.stringContaining('controls=1'),
  )
  expect(disc).toHaveAttribute('data-playing', 'false')
  act(() => reportState(1))
  expect(disc).toHaveAttribute('data-playing', 'true')
  act(() => reportState(2))
  expect(disc).toHaveAttribute('data-playing', 'false')
  await userEvent.click(
    within(dock).getByRole('button', { name: 'Close video panel' }),
  )
  expect(screen.queryByTitle('YouTube music player')).toBeNull()
  expect(destroy).toHaveBeenCalledOnce()
})

it('shows only a linked thumbnail on published stories', () => {
  const value = publicMusic({ ...selection, share: true })
  const { container } = render(<WritingMusic publicCopy value={value} />)
  const link = screen.getByRole('link', {
    name: 'Open video on YouTube (opens in a new tab)',
  })
  expect(link).toHaveAttribute('href', musicUrl(selection))
  expect(link).toHaveAttribute('target', '_blank')
  expect(link.querySelector('img')).toHaveAttribute(
    'src',
    `https://i.ytimg.com/vi/${selection.id}/hqdefault.jpg`,
  )
  expect(container.textContent).toBe('')
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.queryByTitle('YouTube music player')).toBeNull()
})
