import { createClient } from '@supabase/supabase-js'
import { persistentAuthStorage } from './sessionStorage'
import { readAuthConfig } from './config'

export const authConfig = readAuthConfig(import.meta.env)
// Supabase owns session storage, refresh, PKCE, and callback verification.
// Auth persists across tabs until explicit sign-out. Private content stays in Supabase.
function configuredClient() {
  if (!authConfig) return null
  try {
    return createClient(authConfig.url, authConfig.key, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: persistentAuthStorage,
      },
    })
  } catch {
    // Storage restrictions or invalid client configuration must not crash the demo.
    return null
  }
}
export const supabase = configuredClient()
