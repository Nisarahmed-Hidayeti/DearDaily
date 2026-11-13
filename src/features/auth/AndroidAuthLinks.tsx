import { useEffect, useState } from 'react'
import { App as NativeApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { useNavigate } from 'react-router-dom'
import { isAndroidApp } from '../../lib/supabase/nativeStorage'
import { useAuth } from './AuthProvider'

const callbackOrigin = 'https://deardailyy.netlify.app'
export const androidAuthEnabled =
  isAndroidApp && import.meta.env.VITE_ENABLE_ANDROID_AUTH_LINKS === 'true'

export function androidAuthRedirect(recovery = false) {
  return callbackOrigin + (recovery ? '/mobile/recovery' : '/mobile/callback')
}

export function AndroidAuthLinks() {
  const { client, beginSignIn } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!androidAuthEnabled || !client) return
    let active = true
    let exchanging = false

    async function handle(raw: string) {
      if (!active || exchanging) return
      let url: URL
      try {
        url = new URL(raw)
      } catch {
        return
      }
      if (
        url.origin !== callbackOrigin ||
        url.username ||
        url.password ||
        url.hash ||
        !['/mobile/callback', '/mobile/recovery'].includes(url.pathname)
      )
        return
      const codes = url.searchParams.getAll('code')
      if (codes.length !== 1 || !/^[a-zA-Z0-9_-]{20,256}$/.test(codes[0])) {
        setError(true)
        return
      }

      exchanging = true
      setError(false)
      beginSignIn()
      try {
        const result = await client!.auth.exchangeCodeForSession(codes[0])
        if (result.error || !result.data.session) throw new Error()
        await Browser.close().catch(() => {})
        if (active)
          navigate(
            url.pathname === '/mobile/recovery'
              ? '/auth/reset-password'
              : '/account',
            { replace: true },
          )
      } catch {
        if (active) setError(true)
      } finally {
        exchanging = false
      }
    }

    const listener = NativeApp.addListener(
      'appUrlOpen',
      ({ url }) => void handle(url),
    )
    void listener
      .then(() => NativeApp.getLaunchUrl())
      .then((launch) => {
        if (launch) void handle(launch.url)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
      void listener.then((handle) => handle.remove()).catch(() => {})
    }
  }, [beginSignIn, client, navigate])

  return error ? (
    <p role="alert">
      This sign-in link could not be used. Request a fresh link in DearDaily.
    </p>
  ) : null
}
