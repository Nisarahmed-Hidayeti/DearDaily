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
  await userEvent.click(
    screen.getByRole('button', { name: /Add writing music/ }),
  )
  expect(screen.getByText(/not saved or published/)).toBeVisible()
  expect(
    screen.getByRole('link', { name: /Browse Spotify charts/ }),
  ).toHaveAttribute('href', 'https://charts.spotify.com/')
  expect(document.querySelector('iframe')).toBeNull()
})
