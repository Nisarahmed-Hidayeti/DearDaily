import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'

interface AuthState {
  client: SupabaseClient | null
  session: Session | null
  loading: boolean
  recovery: boolean
  error: string
  signOut: () => Promise<boolean>
  finishRecovery: () => void
  beginSignIn: () => void
}
const AuthContext = createContext<AuthState>({
  client: null,
  session: null,
  loading: false,
  recovery: false,
  error: '',
  signOut: async () => false,
  finishRecovery: () => {},
  beginSignIn: () => {},
})
export function AuthProvider({
  children,
  client = supabase,
}: {
  children: ReactNode
  client?: SupabaseClient | null
}) {
  const signedOutLocally = useRef(false)
  const intentVersion = useRef(0)
  const [state, setState] = useState<{
    session: Session | null
    loading: boolean
    recovery: boolean
    error: string
  }>({
    session: null,
    loading: Boolean(client),
    recovery: false,
    error: '',
  })
  useEffect(() => {
    if (!client) return
    let active = true
    let revision = 0
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return
      revision++
      if (signedOutLocally.current && event !== 'SIGNED_OUT') return
      // Keep callback synchronous: awaiting other auth calls here can deadlock.
      setState((previous) => ({
        session,
        loading: false,
        error: '',
        recovery:
          event === 'PASSWORD_RECOVERY' ||
          (Boolean(session) &&
            session?.user.id === previous.session?.user.id &&
            previous.recovery),
      }))
    })
    const initialRevision = revision
    const initialIntent = intentVersion.current
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (
          active &&
          !signedOutLocally.current &&
          initialIntent === intentVersion.current &&
          revision === initialRevision
        ) {
          setState({
            session: error ? null : data.session,
            loading: false,
            recovery: false,
            error: error
              ? 'Your session could not be restored. Please sign in again.'
              : '',
          })
        }
      })
      .catch(() => {
        if (
          active &&
          !signedOutLocally.current &&
          initialIntent === intentVersion.current &&
          revision === initialRevision
        )
          setState({
            session: null,
            loading: false,
            recovery: false,
            error: 'Your session could not be restored. Please sign in again.',
          })
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  async function signOut() {
    if (!client) return false
    signedOutLocally.current = true
    intentVersion.current++
    // Hide all account state before making a network request, even when offline.
    setState({ session: null, loading: true, recovery: false, error: '' })
    try {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw error
      setState({ session: null, loading: false, recovery: false, error: '' })
      return true
    } catch {
      setState({
        session: null,
        loading: false,
        recovery: false,
        error:
          'Sign-out could not finish. Reconnect and retry before leaving this shared device.',
      })
      return false
    }
  }
  return (
    <AuthContext.Provider
      value={{
        ...state,
        client,
        signOut,
        beginSignIn: () => {
          signedOutLocally.current = false
          intentVersion.current++
        },
        finishRecovery: () =>
          setState((previous) => ({ ...previous, recovery: false })),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
export function useAuth() {
  return useContext(AuthContext)
}

export function AuthStatus() {
  const { error, signOut } = useAuth()
  if (!error) return null
  return (
    <div className="auth-notice" role="alert">
      {error}
      <button className="button secondary small" onClick={() => void signOut()}>
        Retry sign-out
      </button>
    </div>
  )
}
