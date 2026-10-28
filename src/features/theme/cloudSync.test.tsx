import { StrictMode } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeProvider'
import { loadCloudTheme, saveCloudTheme } from './cloudTheme'
const account = vi.hoisted(() => ({
  client: {},
  session: { user: { id: 'user-a' } },
  loading: false,
}))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => account }))
vi.mock('./cloudTheme', () => ({
  loadCloudTheme: vi.fn(),
  saveCloudTheme: vi.fn(),
}))
function Probe() {
  const { theme, syncStatus, selectTheme, themeDisabled, retrySync } =
    useTheme()
  return (
    <>
      <p data-testid="theme">{theme}</p>
      <p role="status">{syncStatus}</p>
      <button
        disabled={themeDisabled}
        onClick={() => selectTheme('forest-green')}
      >
        Change theme
      </button>
      <button onClick={retrySync}>Retry</button>
    </>
  )
}
describe('account theme lifecycle', () => {
  beforeEach(() => {
    account.session = { user: { id: 'user-a' } }
    vi.mocked(loadCloudTheme).mockReset()
    vi.mocked(saveCloudTheme).mockReset()
  })
  it('loads correctly under StrictMode without accidental writes', async () => {
    vi.mocked(loadCloudTheme).mockResolvedValue('paper-white')
    render(
      <StrictMode>
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      </StrictMode>,
    )
    await waitFor(() =>
      expect(screen.getByTestId('theme')).toHaveTextContent('paper-white'),
    )
    expect(screen.getByRole('status')).toHaveTextContent('synced')
    expect(saveCloudTheme).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
  })
  it('ignores a previous account response after the provider identity changes', async () => {
    let resolveA!: (theme: 'paper-white') => void
    vi.mocked(loadCloudTheme)
      .mockReturnValueOnce(
        new Promise((done) => {
          resolveA = done
        }),
      )
      .mockResolvedValueOnce('obsidian-black')
    const view = render(
      <ThemeProvider key="user-a">
        <Probe />
      </ThemeProvider>,
    )
    account.session = { user: { id: 'user-b' } }
    view.rerender(
      <ThemeProvider key="user-b">
        <Probe />
      </ThemeProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId('theme')).toHaveTextContent('obsidian-black'),
    )
    await act(async () => {
      resolveA('paper-white')
    })
    expect(screen.getByTestId('theme')).toHaveTextContent('obsidian-black')
  })
  it('does not overwrite cloud data after a read error, and permits retry', async () => {
    vi.mocked(loadCloudTheme)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('paper-white')
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('error'),
    )
    expect(screen.getByRole('button', { name: 'Change theme' })).toBeDisabled()
    expect(saveCloudTheme).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() =>
      expect(screen.getByTestId('theme')).toHaveTextContent('paper-white'),
    )
  })
  it('applies a changed theme only after a confirmed cloud write, never to localStorage', async () => {
    vi.mocked(loadCloudTheme).mockResolvedValue('paper-white')
    let complete!: () => void
    vi.mocked(saveCloudTheme).mockReturnValue(
      new Promise((done) => {
        complete = done
      }),
    )
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Change theme' }),
      ).toBeEnabled(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Change theme' }))
    expect(screen.getByTestId('theme')).toHaveTextContent('paper-white')
    expect(screen.getByRole('status')).toHaveTextContent('saving')
    await act(async () => {
      complete()
    })
    expect(screen.getByTestId('theme')).toHaveTextContent('forest-green')
    expect(localStorage.length).toBe(0)
  })
  it('retains the last confirmed theme when a cloud save fails', async () => {
    vi.mocked(loadCloudTheme).mockResolvedValue('paper-white')
    vi.mocked(saveCloudTheme).mockRejectedValue(new Error('offline'))
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Change theme' }),
      ).toBeEnabled(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Change theme' }))
    expect(screen.getByRole('status')).toHaveTextContent('error')
    expect(screen.getByTestId('theme')).toHaveTextContent('paper-white')
    expect(localStorage.length).toBe(0)
  })
})
