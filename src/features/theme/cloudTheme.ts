import type { SupabaseClient } from '@supabase/supabase-js'
import { isThemeId } from './themes'
import type { ThemeId } from './themes'

export async function loadCloudTheme(
  client: SupabaseClient,
  userId: string,
  initial: ThemeId,
): Promise<ThemeId> {
  const fetch = () =>
    client
      .from('user_settings')
      .select('theme_id')
      .eq('user_id', userId)
      .maybeSingle()
  const first = await fetch()
  if (first.error) throw first.error
  if (first.data) {
    if (!isThemeId(first.data.theme_id)) throw new Error('Invalid theme')
    return first.data.theme_id
  }
  // Only initialize an absent row; never upsert over an existing cloud choice.
  // The supplied ID is a request precondition, enforced by auth.uid() in RLS.
  // A stale request for user A must fail if the SDK session has switched to B.
  const inserted = await client
    .from('user_settings')
    .insert({ user_id: userId, theme_id: initial })
  if (inserted.error && inserted.error.code !== '23505') throw inserted.error
  const result = await fetch()
  if (result.error || !isThemeId(result.data?.theme_id))
    throw new Error('Theme unavailable')
  return result.data.theme_id
}
export async function saveCloudTheme(
  client: SupabaseClient,
  userId: string,
  theme: ThemeId,
) {
  const { data, error } = await client
    .from('user_settings')
    .update({ theme_id: theme })
    .eq('user_id', userId)
    .select('theme_id')
    .single()
  if (error || data?.theme_id !== theme)
    throw new Error('Theme update unavailable')
}
