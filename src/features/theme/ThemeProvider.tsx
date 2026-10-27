import { flushSync } from 'react-dom'
import { createContext, useContext, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { localThemePreference } from './themePreference'
import type { ThemePreferenceStore } from './themePreference'
import type { ThemeId } from './themes'

interface ThemeContextValue {
  theme: ThemeId
  selectTheme: (theme: ThemeId) => void
  storageAvailable: boolean
}
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  store = localThemePreference,
}: {
  children: ReactNode
  store?: ThemePreferenceStore
}) {
  const [theme, setTheme] = useState<ThemeId>(() => store.read())
  const [storageAvailable, setStorageAvailable] = useState(true)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg')
      .trim()
    if (color)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', color)
  }, [theme])

  function selectTheme(next: ThemeId) {
    const saved = store.write(next)
    const update = () => {
      setTheme(next)
      setStorageAvailable(saved)
    }
    if (
      next !== theme &&
      document.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      document.startViewTransition(() => flushSync(update))
    } else {
      update()
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, selectTheme, storageAvailable }}>
      {children}
    </ThemeContext.Provider>
  )
}
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
