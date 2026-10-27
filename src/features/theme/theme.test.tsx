import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from '../../App'
import { themeStorageKey } from './themePreference'
import { themes } from './themes'

function renderApp(path = '/app/settings') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('theme preferences', () => {
  it('defaults to Midnight Purple without persisting an untouched preference', () => {
    renderApp()
    expect(screen.getByRole('radio', { name: 'Midnight Purple' })).toBeChecked()
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'midnight-purple',
    )
    expect(localStorage.length).toBe(0)
  })

  it.each(themes)(
    'selects and restores $name across a fresh app mount',
    async (preset) => {
      const view = renderApp()
      if (preset.id === 'midnight-purple') {
        await userEvent.click(
          screen.getByRole('radio', { name: 'Forest Green' }),
        )
      }
      await userEvent.click(screen.getByRole('radio', { name: preset.name }))
      expect(document.documentElement).toHaveAttribute('data-theme', preset.id)
      expect(localStorage.getItem(themeStorageKey)).toBe(preset.id)
      view.unmount()
      renderApp()
      expect(screen.getByRole('radio', { name: preset.name })).toBeChecked()
      expect(screen.getByRole('status')).toHaveTextContent(
        `${preset.name} is active`,
      )
    },
  )

  it('keeps the chosen theme across landing, editor, dashboard, and story routes', async () => {
    renderApp()
    await userEvent.click(screen.getByRole('radio', { name: 'Paper White' }))
    await userEvent.click(
      screen.getByRole('link', { name: /See your theme on the homepage/ }),
    )
    expect(
      screen.getByRole('heading', { name: 'Every day has a story.' }),
    ).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'paper-white',
    )
    await userEvent.click(screen.getByRole('link', { name: 'Start writing' }))
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'paper-white',
    )
    await userEvent.click(screen.getByRole('link', { name: 'Overview' }))
    expect(
      screen.getByRole('region', { name: 'Writing activity calendar' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Explore stories' }))
    await userEvent.click(
      screen.getByRole('link', { name: /There is no hurry to become/ }),
    )
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'paper-white',
    )
    expect(
      screen.getByText(/Last Sunday, I walked without a destination/),
    ).toBeInTheDocument()
  })

  it('supports arrow-key selection with native radio semantics', async () => {
    renderApp()
    const midnight = screen.getByRole('radio', { name: 'Midnight Purple' })
    midnight.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Forest Green' })).toBeChecked()
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'forest-green',
    )
  })

  it.each([false, true])(
    'respects reduced motion (%s) when switching themes',
    async (reduceMotion) => {
      const transition = vi.fn((update: () => void) => update())
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: reduceMotion })),
      )
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: transition,
      })
      try {
        renderApp()
        await userEvent.click(
          screen.getByRole('radio', { name: 'Forest Green' }),
        )
        expect(transition).toHaveBeenCalledTimes(reduceMotion ? 0 : 1)
        expect(document.documentElement).toHaveAttribute(
          'data-theme',
          'forest-green',
        )
      } finally {
        Reflect.deleteProperty(document, 'startViewTransition')
        vi.unstubAllGlobals()
      }
    },
  )

  it('ignores an invalid stored value', () => {
    localStorage.setItem(themeStorageKey, 'not-a-theme')
    renderApp()
    expect(screen.getByRole('radio', { name: 'Midnight Purple' })).toBeChecked()
  })

  it('works when reading or writing browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked')
    })
    renderApp()
    await userEvent.click(screen.getByRole('radio', { name: 'Forest Green' }))
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'forest-green',
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Browser storage is unavailable',
    )
  })

  it('persists only the theme and never journal title, body, mood, or tags', async () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    renderApp()
    await userEvent.click(screen.getByRole('radio', { name: 'Obsidian Black' }))
    await userEvent.click(screen.getByRole('link', { name: 'Write an entry' }))
    await userEvent.type(screen.getByLabelText('Entry title'), 'Private title')
    await userEvent.type(
      screen.getByLabelText('Journal body'),
      'A private thought',
    )
    await userEvent.type(screen.getByLabelText('Tags'), 'private-tag{enter}')
    await userEvent.click(screen.getByRole('button', { name: /Happy/ }))
    expect(writes).toHaveBeenCalledExactlyOnceWith(
      themeStorageKey,
      'obsidian-black',
    )
    expect(localStorage.length).toBe(1)
  })
})
