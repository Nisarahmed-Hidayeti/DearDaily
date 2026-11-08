import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { VoiceNotes, VoicePlayer } from './VoiceNotes'
const auth = vi.hoisted(() => ({
  client: {},
  session: { user: { id: 'owner-a' } },
}))
const api = vi.hoisted(() => ({
  voiceUrl: vi.fn(async () => 'https://example.test/signed-audio'),
}))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => auth }))
vi.mock('./audioApi', () => api)
const note = {
  id: '81000000-0000-4000-8000-000000000001',
  title: 'A quiet thought',
  start: 10,
  end: 19,
  share: false,
}
it('puts compact audio controls behind an explicit action and never opts into publication', async () => {
  const change = vi.fn()
  render(<VoiceNotes notes={[note]} onChange={change} onUpload={vi.fn()} />)
  expect(screen.queryByLabelText('Include in public copy')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: '+ Add audio' }))
  expect(screen.getByLabelText('Include in public copy')).not.toBeChecked()
  await userEvent.click(screen.getByLabelText('Include in public copy'))
  expect(change).toHaveBeenCalledWith([{ ...note, share: true }])
})
it('keeps public readers away from editing and recording controls', () => {
  render(
    <VoiceNotes
      notes={[{ id: note.id, title: note.title, start: 10, end: 19 }]}
      publicCopy
    />,
  )
  expect(screen.queryByRole('button', { name: '+ Add audio' })).toBeNull()
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(screen.getByText('0:10–0:19')).toBeVisible()
  expect(document.querySelector('audio')).toBeNull()
})
it('does not retain a private signed player when switching accounts', async () => {
  auth.session.user.id = 'owner-a'
  const { rerender } = render(<VoicePlayer note={note} />)
  await userEvent.click(screen.getByRole('button', { name: '▶ Listen' }))
  expect(document.querySelector('audio')).not.toBeNull()
  expect(document.querySelector('audio')?.autoplay).toBe(true)
  auth.session.user.id = 'owner-b'
  rerender(<VoicePlayer note={note} />)
  expect(document.querySelector('audio')).toBeNull()
  auth.session.user.id = 'owner-a'
})
it('starts and stops at the selected excerpt rather than playing the remainder', () => {
  const pause = vi
    .spyOn(HTMLMediaElement.prototype, 'pause')
    .mockImplementation(() => {})
  render(<VoicePlayer note={note} localSource="blob:synthetic" />)
  const player = document.querySelector('audio')!
  Object.defineProperty(player, 'currentTime', { value: 0, writable: true })
  fireEvent.play(player)
  expect(player.currentTime).toBe(10)
  player.currentTime = 19.2
  fireEvent.timeUpdate(player)
  expect(pause).toHaveBeenCalled()
  expect(player.currentTime).toBe(10)
  pause.mockRestore()
})
it('handles microphone refusal without losing existing notes', async () => {
  vi.stubGlobal('MediaRecorder', class {})
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => {
        throw Error('Microphone permission denied')
      }),
    },
  })
  const change = vi.fn()
  render(<VoiceNotes notes={[note]} onChange={change} onUpload={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: '+ Add audio' }))
  await userEvent.click(screen.getByRole('button', { name: '● Record' }))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Microphone permission denied',
  )
  expect(change).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})
