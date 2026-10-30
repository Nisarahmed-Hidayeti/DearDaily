import { createClient } from '@supabase/supabase-js'
import { createMediaHandler } from '../_shared/mediaHandler.ts'
const url = Deno.env.get('SUPABASE_URL')!,
  service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  key = Deno.env.get('SUPABASE_ANON_KEY')!
const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const origins = (
  Deno.env.get('MEDIA_ALLOWED_ORIGINS') ?? 'http://localhost:5173'
)
  .split(',')
  .map((v) => v.trim())
Deno.serve(
  createMediaHandler(
    admin,
    (authorization) =>
      createClient(url, key, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    origins,
    Deno.env.get('MEDIA_PUBLIC_BASE_URL') ?? url,
  ),
)
