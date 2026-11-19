import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { it, expect, vi, beforeEach } from 'vitest'
import Shell, { sidebarPreferenceKey } from './Shell'
const auth = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  signOut: vi.fn().mockResolvedValue(true),
}))
vi.mock('../features/auth/AuthProvider', () => ({ useAuth: () => auth }))
beforeEach(() => {
  auth.session = null
  auth.signOut.mockClear()
})
function workspace(path = '/app/write') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Shell />}>
          <Route
            path="*"
            element={
              <input
                aria-label="Synthetic writing"
                defaultValue="Keep my cursor here"
              />
            }
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}
function primaryLink(label: string) {
  return within(
    screen.getByRole('navigation', { name: 'Primary navigation' }),
  ).getByRole('link', { name: label })
}
it('automatically minimizes navigation for writing without saving an implicit preference', async () => {
  workspace()
  expect(document.querySelector('.studio-shell')).toHaveAttribute(
    'data-collapsed',
    'true',
  )
  expect(localStorage.getItem(sidebarPreferenceKey)).toBeNull()
  await userEvent.click(primaryLink('Home'))
  expect(document.querySelector('.studio-shell')).toHaveAttribute(
    'data-collapsed',
    'false',
  )
  await userEvent.click(primaryLink('My Journal'))
  expect(primaryLink('My Journal')).toHaveAttribute(
    'aria-current',
    'page',
  )
})
it('remembers an explicit layout and preserves focus, selection and writing on pointer toggle', async () => {
  const view = workspace()
  const input = screen.getByLabelText('Synthetic writing') as HTMLInputElement
  input.focus()
  input.setSelectionRange(5, 9)
  await userEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
  expect(input).toHaveFocus()
  expect(input.selectionStart).toBe(5)
  expect(input.selectionEnd).toBe(9)
  expect(input).toHaveValue('Keep my cursor here')
  expect(localStorage.getItem(sidebarPreferenceKey)).toBe('expanded')
  view.unmount()
  workspace()
  expect(document.querySelector('.studio-shell')).toHaveAttribute(
    'data-collapsed',
    'false',
  )
})
it('moves settings/profile into the account disclosure and closes it with Escape', async () => {
  workspace('/app')
  expect(screen.queryByRole('link', { name: 'Public profile' })).toBeNull()
  await userEvent.click(screen.getByLabelText('Open account menu'))
  const details = document.querySelector(
    '.studio-account',
  ) as HTMLDetailsElement
  expect(details.open).toBe(true)
  expect(
    screen.getByRole('link', { name: 'Settings & appearance' }),
  ).toHaveAttribute('href', '/app/settings')
  await userEvent.keyboard('{Escape}')
  expect(details.open).toBe(false)
  expect(screen.getByLabelText('Open account menu')).toHaveFocus()
})
it('keeps mobile navigation at the bottom and opens account controls separately', async () => {
  const { container } = workspace()
  const mobileTabs = container.querySelector('.studio-mobile-tabs')
  expect(mobileTabs).toBeInTheDocument()
  expect(mobileTabs).toHaveTextContent('Home')
  expect(mobileTabs).toHaveTextContent('Journal')
  expect(mobileTabs).toHaveTextContent('Write')
  expect(mobileTabs).toHaveTextContent('Explore')
  const accountButton = mobileTabs?.querySelector('button')
  expect(accountButton).toHaveAccessibleName('Open account controls')
  fireEvent.click(accountButton!)
  const dialog = screen.getByRole('dialog', { name: 'Your workspace' })
  expect(dialog).toHaveAttribute('open')
  expect(
    within(dialog).getByRole('link', { name: 'Settings & appearance' }),
  ).toBeVisible()
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Close dialog' }),
  )
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('continues to toggle when preference storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw Error('Unavailable')
  })
  workspace()
  await userEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
  expect(document.querySelector('.studio-shell')).toHaveAttribute(
    'data-collapsed',
    'false',
  )
})

it('does not discard unsaved writing through the account sign-out shortcut', async () => {
  auth.session = { user: { id: 'synthetic-writer' } }
  workspace()
  const marker = document.createElement('div')
  marker.setAttribute('data-unsaved-writing', 'true')
  document.body.append(marker)
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  try {
    await userEvent.click(screen.getByLabelText('Open account menu'))
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(confirm).toHaveBeenCalled()
    expect(auth.signOut).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(auth.signOut).toHaveBeenCalledOnce()
  } finally {
    marker.remove()
  }
})
