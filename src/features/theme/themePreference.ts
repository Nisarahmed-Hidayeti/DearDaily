import { defaultTheme, isThemeId } from './themes'
import type { ThemeId } from './themes'

export const themeStorageKey = 'deardaily.theme'

/** Theme-only boundary. A future account sync can consume validated IDs here. */
export interface ThemePreferenceStore {
  read(): ThemeId
  write(theme: ThemeId): boolean
}

export const localThemePreference: ThemePreferenceStore = {
  read() {
    try {
      const saved = window.localStorage.getItem(themeStorageKey)
      return isThemeId(saved) ? saved : defaultTheme
    } catch {
      return defaultTheme
    }
  },
  write(theme) {
    try {
      window.localStorage.setItem(themeStorageKey, theme)
      return true
    } catch {
      // Blocked storage must never prevent choosing a theme for this session.
      return false
    }
  },
}
