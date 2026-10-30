import { useTheme } from '../theme/ThemeProvider'
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  appearanceEnabled,
  appearanceTokens,
  themeBackgrounds,
  defaultAppearance,
  validateAppearance,
  type Appearance,
} from './appearance'
const key = 'deardaily.guest-appearance'
function guest() {
  try {
    return validateAppearance(JSON.parse(localStorage.getItem(key) || '{}'))
  } catch {
    return defaultAppearance
  }
}
const Context = createContext<{
  appearance: Appearance
  status: string
  save: (p: Appearance, expected?: Appearance) => Promise<boolean>
  retry: () => void
}>({
  appearance: defaultAppearance,
  status: 'guest',
  save: async () => false,
  retry: () => {},
})
export const useAppearance = () => useContext(Context)
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const { client, session } = useAuth(),
    user = session?.user.id
  const [appearance, setAppearance] = useState(() =>
      user ? defaultAppearance : guest(),
    ),
    [status, setStatus] = useState(
      user ? (appearanceEnabled ? 'loading' : 'blocked') : 'guest',
    ),
    [refresh, setRefresh] = useState(0)
  const revision = useRef<string | null>(null),
    sequence = useRef(0),
    active = useRef(true),
    busy = useRef(false)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    if (!user || !client || !appearanceEnabled) return
    let cancelled = false
    const load = async () => {
      const request = ++sequence.current
      if (
        busy.current ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      )
        return
      try {
        const { data, error } = await client
          .from('user_settings')
          .select('appearance,updated_at')
          .eq('user_id', user)
          .maybeSingle()
        if (!error && !data) {
          const inserted = await client
            .from('user_settings')
            .insert({ user_id: user })
          if (inserted.error && inserted.error.code !== '23505')
            throw inserted.error
          if (!cancelled) setRefresh((n) => n + 1)
          return
        }
        if (error) throw error
        const next = validateAppearance(data!.appearance)
        if (!cancelled && request === sequence.current) {
          revision.current = data!.updated_at
          setAppearance(next)
          setStatus('synced')
        }
      } catch {
        if (!cancelled && request === sequence.current) setStatus('error')
      }
    }
    void load()
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 30000)
    window.addEventListener('focus', load)
    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('focus', load)
    }
  }, [client, user, refresh])
  useLayoutEffect(() => {
    const tokens = appearanceTokens(appearance, themeBackgrounds[theme]),
      root = document.documentElement
    Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v))
    root.dataset.writingFont = appearance.font
    root.dataset.writingSpacing = appearance.spacing
    root.dataset.writingTexture = appearance.texture
    return () => {
      Object.keys(tokens).forEach((k) => root.style.removeProperty(k))
      delete root.dataset.writingFont
      delete root.dataset.writingSpacing
      delete root.dataset.writingTexture
    }
  }, [appearance, theme])
  async function save(next: Appearance, expected?: Appearance) {
    if (busy.current) return false
    // A remote refresh must never silently overwrite a preview based on older settings.
    if (expected && JSON.stringify(expected) !== JSON.stringify(appearance))
      return false
    const valid = validateAppearance(next)
    if (
      user &&
      (!appearanceEnabled || status !== 'synced' || !revision.current)
    )
      return false
    busy.current = true
    sequence.current++
    setStatus('saving')
    try {
      if (user && client) {
        const { data, error } = await client
          .from('user_settings')
          .update({ appearance: valid })
          .eq('user_id', user)
          .eq('updated_at', revision.current!)
          .select('appearance,updated_at')
          .single()
        if (error || !data) throw Error('Not confirmed')
        if (!active.current) return false
        revision.current = data.updated_at
        setAppearance(validateAppearance(data.appearance))
        setStatus('synced')
      } else {
        localStorage.setItem(key, JSON.stringify(valid))
        setAppearance(valid)
        setStatus('guest')
      }
      return true
    } catch {
      if (active.current) setStatus('error')
      return false
    } finally {
      busy.current = false
    }
  }
  return (
    <Context.Provider
      value={{
        appearance,
        status,
        save,
        retry: () => setRefresh((n) => n + 1),
      }}
    >
      {children}
    </Context.Provider>
  )
}
