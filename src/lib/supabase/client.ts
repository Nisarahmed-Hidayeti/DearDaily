import { createClient } from '@supabase/supabase-js'
import { readAuthConfig } from './config'

export const authConfig = readAuthConfig(import.meta.env)
// Supabase owns session storage, refresh, PKCE, and callback verification.
// Tab-scoped sessionStorage keeps localStorage limited to the guest theme.
function configuredClient() {
  if (!authConfig) return null
  try {
    return createClient(authConfig.url, authConfig.key, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.sessionStorage,
      },
    })
  } catch {
    // Storage restrictions or invalid client configuration must not crash the demo.
    return null
  }
}
export const supabase = configuredClient()
