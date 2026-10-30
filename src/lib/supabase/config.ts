export const approvedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://deardailyy.netlify.app',
] as const

export interface AuthConfig {
  url: string
  key: string
  allowSignup: boolean
  captchaSiteKey: string | null
}
export function readAuthConfig(
  env: Record<string, unknown>,
): AuthConfig | null {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (typeof url !== 'string' || typeof key !== 'string') return null
  try {
    const parsed = new URL(url)
    const hosted =
      parsed.protocol === 'https:' &&
      /^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname)
    const local =
      parsed.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(parsed.hostname) &&
      parsed.port === '54321'
    if (
      (!hosted && !local) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== '/'
    )
      return null
    if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key)) return null
    return {
      url: parsed.origin,
      key,
      allowSignup: env.VITE_ALLOW_SIGNUP === 'true',
      captchaSiteKey: typeof env.VITE_TURNSTILE_SITE_KEY === 'string' && /^[A-Za-z0-9_-]{10,100}$/.test(env.VITE_TURNSTILE_SITE_KEY) ? env.VITE_TURNSTILE_SITE_KEY : null,
    }
  } catch {
    return null
  }
}
export function authRedirect(
  path: '/auth/callback' | '/auth/reset-password',
  origin = window.location.origin,
): string {
  if (!approvedOrigins.some((allowed) => allowed === origin))
    throw new Error('Unapproved authentication origin')
  return origin + path
}
// Only known internal destinations can be used after login; never echo a URL.
export function safeNext(value: string | null): string {
  return value === '/app/settings' || value === '/account' ? value : '/account'
}
