import { useEffect, useRef, useState } from 'react'
interface Turnstile {
  render(
    element: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback': () => void
      'timeout-callback': () => void
      'error-callback': (code: string) => void
      theme: 'auto'
      size: 'flexible'
    },
  ): string
  remove(id: string): void
}
declare global {
  interface Window {
    turnstile?: Turnstile
  }
}
let loader: Promise<void> | null = null
function loadWidget() {
  if (window.turnstile) return Promise.resolve()
  if (loader) return loader
  loader = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => {
      clearTimeout(timer)
      loader = null
      script.remove()
      reject(new Error('Verification unavailable'))
    }
    const timer = setTimeout(fail, 15000)
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (!window.turnstile) {
        fail()
        return
      }
      clearTimeout(timer)
      resolve()
    }
    script.onerror = fail
    document.head.appendChild(script)
  })
  return loader
}
export default function BotCheck({
  siteKey,
  onToken,
}: {
  siteKey: string
  onToken: (token: string) => void
}) {
  const target = useRef<HTMLDivElement>(null)
  const [failure, setFailure] = useState('')
  const [verified, setVerified] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true,
      id: string | undefined
    const fail = (message: string) => {
      if (!active) return
      onToken('')
      setVerified(false)
      setFailure(message)
    }
    const timer = setTimeout(
      () =>
        fail(
          'Verification is taking longer than expected. Retry, or open DearDaily in your regular browser.',
        ),
      45000,
    )
    void loadWidget()
      .then(() => {
        if (!active || !target.current) return
        id = window.turnstile!.render(target.current, {
          sitekey: siteKey,
          theme: 'auto',
          size: 'flexible',
          callback: (token) => {
            if (!active) return
            clearTimeout(timer)
            setFailure('')
            setVerified(true)
            onToken(token)
          },
          'expired-callback': () =>
            fail('Verification expired. Please verify again.'),
          'timeout-callback': () =>
            fail('Verification timed out. Please retry.'),
          'error-callback': (code) => {
            clearTimeout(timer)
            const safeCode = /^\d{3,6}$/.test(code) ? ` (code ${code})` : ''
            fail(
              `Verification could not complete${safeCode}. Check your connection or try your regular browser.`,
            )
          },
        })
      })
      .catch(() => {
        clearTimeout(timer)
        fail('Verification could not load. Check your connection and retry.')
      })
    return () => {
      active = false
      clearTimeout(timer)
      if (id) window.turnstile?.remove(id)
    }
  }, [siteKey, onToken, attempt])
  return (
    <div className="bot-check">
      <div ref={target} />
      {failure ? (
        <>
          <p role="alert">{failure} No authentication request was sent.</p>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              onToken('')
              setFailure('')
              setVerified(false)
              setAttempt((n) => n + 1)
            }}
          >
            Retry verification
          </button>
        </>
      ) : (
        <p className="tiny muted" role="status">
          {verified
            ? 'Verification complete.'
            : 'Complete the verification before continuing. This uses Cloudflare Turnstile.'}
        </p>
      )}
    </div>
  )
}
