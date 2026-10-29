import { useLayoutEffect } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppearanceProvider, useAppearance } from './AppearanceProvider'
import { defaultAppearance } from './appearance'
const mocks = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('../auth/AuthProvider', () => ({ useAuth: mocks.auth }))
vi.mock('../theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'paper-white' }),
}))
vi.mock('./appearance', async (original) => ({
  ...(await original<typeof import('./appearance')>()),
  appearanceEnabled: true,
}))
let current: ReturnType<typeof useAppearance>
function Probe() {
  const value = useAppearance()
  useLayoutEffect(() => {
    current = value
  }, [value])
  return (
    <span>
      {value.status} / {value.appearance.font}
    </span>
  )
}
function fixture() {
  let row = { appearance: { ...defaultAppearance }, updated_at: 'revision-1' }
  const update = vi.fn(),
    conditions: unknown[][] = []
  const q = {
    select: () => q,
    eq: (...args: unknown[]) => {
      conditions.push(args)
      return q
    },
    maybeSingle: vi.fn(async () => ({ data: row, error: null })),
    update: (value: unknown) => {
      update(value)
      return q
    },
    single: vi.fn(async () => ({ data: row, error: null })),
  }
  return {
    client: { from: () => q },
    q,
    update,
    conditions,
    replace: (next: typeof row) => {
      row = next
    },
  }
}
beforeEach(() => {
  localStorage.clear()
  mocks.auth.mockReset()
})
it('rejects an old preview after a remote appearance refresh', async () => {
  const f = fixture()
  mocks.auth.mockReturnValue({
    client: f.client,
    session: { user: { id: 'A' } },
  })
  render(
    <AppearanceProvider>
      <Probe />
    </AppearanceProvider>,
  )
  await screen.findByText('synced / sans')
  const base = current.appearance
  f.replace({
    appearance: { ...defaultAppearance, font: 'serif' },
    updated_at: 'revision-2',
  })
  act(() => window.dispatchEvent(new Event('focus')))
  await screen.findByText('synced / serif')
  let saved = true
  await act(async () => {
    saved = await current.save({ ...base, size: 20 }, base)
  })
  expect(saved).toBe(false)
  expect(f.update).not.toHaveBeenCalled()
})
it('does not claim success or apply an unconfirmed cloud update', async () => {
  const f = fixture()
  mocks.auth.mockReturnValue({
    client: f.client,
    session: { user: { id: 'A' } },
  })
  render(
    <AppearanceProvider>
      <Probe />
    </AppearanceProvider>,
  )
  await screen.findByText('synced / sans')
  f.q.single.mockResolvedValueOnce({
    data: null as never,
    error: { message: 'Conflict' } as never,
  })
  let saved = true
  await act(async () => {
    saved = await current.save(
      { ...defaultAppearance, font: 'serif' },
      current.appearance,
    )
  })
  expect(saved).toBe(false)
  expect(screen.getByText('error / sans')).toBeInTheDocument()
  expect(f.conditions).toContainEqual(['updated_at', 'revision-1'])
  expect(localStorage.length).toBe(0)
})
it('clears account styling and ignores a late response after switching users', async () => {
  const a = fixture(),
    b = fixture()
  let resolve: (value: {
    data: { appearance: typeof defaultAppearance; updated_at: string }
    error: null
  }) => void = () => {}
  a.q.maybeSingle.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  mocks.auth.mockReturnValue({
    client: a.client,
    session: { user: { id: 'A' } },
  })
  const view = render(
    <AppearanceProvider key="A">
      <Probe />
    </AppearanceProvider>,
  )
  mocks.auth.mockReturnValue({
    client: b.client,
    session: { user: { id: 'B' } },
  })
  view.rerender(
    <AppearanceProvider key="B">
      <Probe />
    </AppearanceProvider>,
  )
  await screen.findByText('synced / sans')
  await act(async () => {
    resolve({
      data: {
        appearance: {
          ...defaultAppearance,
          font: 'serif',
          background: '#33114f',
        },
        updated_at: 'late-A',
      },
      error: null,
    })
  })
  expect(screen.getByText('synced / sans')).toBeInTheDocument()
  expect(document.documentElement.style.getPropertyValue('--bg')).toBe('')
})
it('stores only safe guest appearance and never imports it into an authenticated account', async () => {
  mocks.auth.mockReturnValue({ client: null, session: null })
  const view = render(
    <AppearanceProvider key="guest">
      <Probe />
    </AppearanceProvider>,
  )
  await act(async () => {
    expect(await current.save({ ...defaultAppearance, font: 'serif' })).toBe(
      true,
    )
  })
  expect(
    JSON.parse(localStorage.getItem('deardaily.guest-appearance')!).font,
  ).toBe('serif')
  const f = fixture()
  mocks.auth.mockReturnValue({
    client: f.client,
    session: { user: { id: 'B' } },
  })
  view.rerender(
    <AppearanceProvider key="B">
      <Probe />
    </AppearanceProvider>,
  )
  await waitFor(() =>
    expect(screen.getByText('synced / sans')).toBeInTheDocument(),
  )
  expect(f.update).not.toHaveBeenCalled()
})
