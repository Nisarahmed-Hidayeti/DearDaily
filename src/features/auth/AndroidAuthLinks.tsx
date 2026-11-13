import { useEffect, useRef, useState } from 'react'
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

export function parseAndroidAuthLink(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (
    url.origin !== callbackOrigin ||
    url.username ||
    url.password ||
    url.hash ||
    !['/mobile/callback', '/mobile/recovery'].includes(url.pathname)
  )
    return null

  const codes = url.searchParams.getAll('code')
  const flowIds = url.searchParams.getAll('sb_flow_id')
  const flowId = flowIds[0]
  if (
    codes.length !== 1 ||
    !/^[a-zA-Z0-9_-]{20,256}$/.test(codes[0]) ||
    flowIds.length > 1 ||
    (flowId !== undefined && !/^[a-zA-Z0-9_-]{8,64}$/.test(flowId)) ||
    url.searchParams.has('error')
  )
    return { invalid: true } as const

  return {
    code: codes[0],
    flowId,
    recovery: url.pathname === '/mobile/recovery',
  }
}

export function AndroidAuthLinks() {
  const { client, beginSignIn } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(false)
  const handled = useRef(new Set<string>())

  useEffect(() => {
    if (!androidAuthEnabled || !client) return
    let active = true
    let exchanging = false

    const auth = client.auth
    async function handle(raw: string) {
      if (!active || exchanging) return
      const link = parseAndroidAuthLink(raw)
      if (!link) return
      if ('invalid' in link) {
        setError(true)
        return
      }
      if (handled.current.has(link.code)) return
      if (handled.current.size >= 16) handled.current.clear()
      handled.current.add(link.code)
      exchanging = true
      setError(false)
      beginSignIn()
      try {
        const result = await auth.exchangeCodeForSession(
          link.code,
          link.flowId === undefined ? undefined : { flowId: link.flowId },
        )
        if (result.error || !result.data.session) throw new Error()
        await Browser.close().catch(() => {})
        if (active)
          navigate(link.recovery ? '/auth/reset-password' : '/account', {
            replace: true,
          })
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
