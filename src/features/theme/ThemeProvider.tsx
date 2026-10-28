import { flushSync } from 'react-dom'
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { localThemePreference } from './themePreference'
import type { ThemePreferenceStore } from './themePreference'
import type { ThemeId } from './themes'
import { useAuth } from '../auth/AuthProvider'
import { loadCloudTheme, saveCloudTheme } from './cloudTheme'

interface ThemeContextValue {
  theme: ThemeId
  selectTheme: (theme: ThemeId) => void
  storageAvailable: boolean
  syncStatus: 'guest' | 'loading' | 'synced' | 'saving' | 'error'
  retrySync: () => void
  themeDisabled: boolean
}
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  store = localThemePreference,
}: {
  children: ReactNode
  store?: ThemePreferenceStore
}) {
  const { client, session, loading: authLoading } = useAuth()
  const userId = session?.user.id
  const [syncStatus, setSyncStatus] = useState<ThemeContextValue['syncStatus']>(
    userId ? 'loading' : 'guest',
  )
  const [refresh, setRefresh] = useState(0)
  const busy = useRef(false)
  const active = useRef(true)
  const [initialTheme] = useState(() => store.read())
  const [theme, setTheme] = useState<ThemeId>(() => store.read())
  const [storageAvailable, setStorageAvailable] = useState(true)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    if (!client || !userId) return
    let cancelled = false
    const load = async () => {
      if (busy.current) return
      busy.current = true
      try {
        const cloud = await loadCloudTheme(client, userId, initialTheme)
        if (!cancelled) {
          setTheme(cloud)
          setSyncStatus('synced')
        }
      } catch {
        if (!cancelled) setSyncStatus('error')
      } finally {
        if (!cancelled) busy.current = false
      }
    }
    const onFocus = () => {
      if (document.visibilityState === 'visible') void load()
    }
    void load()
    // Reads on focus + while visible pick up changes made on another device.
    const timer = window.setInterval(onFocus, 30_000)
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      busy.current = false
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [client, userId, initialTheme, refresh])

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

  async function selectTheme(next: ThemeId) {
    if (authLoading || busy.current || (userId && syncStatus !== 'synced'))
      return
    let saved = true
    if (client && userId) {
      busy.current = true
      setSyncStatus('saving')
      try {
        await saveCloudTheme(client, userId, next)
        if (!active.current) return
        setSyncStatus('synced')
      } catch {
        if (active.current) setSyncStatus('error')
        return
      } finally {
        busy.current = false
      }
    } else {
      saved = store.write(next)
    }
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
    <ThemeContext.Provider
      value={{
        theme,
        selectTheme,
        storageAvailable,
        syncStatus,
        retrySync: () => {
          setSyncStatus('loading')
          setRefresh((n) => n + 1)
        },
        themeDisabled:
          authLoading || Boolean(userId && syncStatus !== 'synced'),
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
