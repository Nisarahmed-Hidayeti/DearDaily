import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { spotifyEntity, WritingMusic } from './WritingMusic'

it('accepts canonical Spotify entities and rejects arbitrary embeds and credentials', () => {
  const id = '4uLU6hMCjMI75M1A2tKUQC'
  expect(spotifyEntity(`https://open.spotify.com/track/${id}?si=ignored`)).toBe(
    `spotify:track:${id}`,
  )
  for (const url of [
    `http://open.spotify.com/track/${id}`,
    `https://evil.com/track/${id}`,
    `https://user@open.spotify.com/track/${id}`,
    `https://open.spotify.com/embed/track/${id}`,
    'javascript:alert(1)',
  ])
    expect(spotifyEntity(url)).toBeNull()
})

it('does not contact Spotify before consent and explains the session-only boundary', async () => {
  render(<WritingMusic />)
  expect(document.querySelector('script[src*="spotify"]')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: '♫ Music' }))
  expect(screen.getByText(/not saved or published/)).toBeVisible()
  expect(
    screen.getByRole('link', { name: /Browse Spotify charts/ }),
  ).toHaveAttribute('href', 'https://charts.spotify.com/')
  expect(document.querySelector('iframe')).toBeNull()
})

it('does not auto-load saved public music or expose private sharing controls', async () => {
  render(
    <WritingMusic
      publicCopy
      value={{
        provider: 'spotify',
        kind: 'track',
        id: '4uLU6hMCjMI75M1A2tKUQC',
      }}
    />,
  )
  await userEvent.click(screen.getByRole('button', { name: '♫ Music' }))
  expect(
    screen.getByRole('link', { name: /Open selected music/ }),
  ).toHaveAttribute(
    'href',
    'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
  )
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(screen.queryByLabelText('Spotify link')).toBeNull()
  expect(document.querySelector('iframe')).toBeNull()
})

it('rejects malicious API music without crashing the journal', async () => {
  render(
    <WritingMusic
      publicCopy
      value={{ provider: 'spotify', kind: 'track', id: 'javascript:alert(1)' }}
    />,
  )
  await userEvent.click(screen.getByRole('button', { name: '♫ Music' }))
  expect(screen.queryByRole('link', { name: /Open selected music/ })).toBeNull()
})
it('keeps the player compact and has no custom Space or playback controls', async () => {
  render(
    <WritingMusic
      value={{
        provider: 'spotify',
        kind: 'track',
        id: '4uLU6hMCjMI75M1A2tKUQC',
        share: false,
      }}
      onChange={() => {}}
    />,
  )
  await userEvent.click(screen.getByRole('button', { name: '♫ Music' }))
  await userEvent.click(
    screen.getByRole('button', { name: 'Load selected music' }),
  )
  expect(screen.getByRole('button', { name: '♫ Music' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  expect(screen.queryByRole('button', { name: 'Play / pause' })).toBeNull()
  expect(screen.queryByText(/press Space/)).toBeNull()
  expect(screen.queryByLabelText('Spotify link')).toBeNull()
  const frame = screen.getByTitle('Spotify music player')
  await userEvent.click(screen.getByRole('button', { name: 'Hide player' }))
  expect(frame).not.toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Show player' }))
  expect(screen.getByTitle('Spotify music player')).toBe(frame)
  expect(frame).toBeVisible()
  expect(frame).toHaveAttribute(
    'src',
    'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
  )
  expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer')
  expect(frame).toHaveAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox',
  )
  expect(document.querySelector('script[src*="spotify"]')).toBeNull()
})
