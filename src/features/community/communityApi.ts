import type { SupabaseClient } from '@supabase/supabase-js'
import type { PublicStory } from '../journal/journalApi'
import { richPublicFields } from '../rich-editor/config'
export const communityEnabled = import.meta.env.VITE_ENABLE_COMMUNITY === 'true'
export const categories = [
  'Uncategorized',
  'Personal',
  'Gratitude',
  'Growth',
  'Travel',
]
export const avatars: Record<string, string> = {
  leaf: '❧',
  moon: '☾',
  sun: '☀',
  book: '▤',
}
export interface PublicProfile {
  username: string
  display_name: string
  bio: string
  avatar: string
  visible: boolean
  joined_month: string | null
}
export interface StoryMetadata {
  public_username: string | null
  public_category: string
  public_tags: string[]
}
export type CommunityStory = PublicStory & Partial<StoryMetadata>
export const profileFields =
  'username,display_name,bio,avatar,visible,joined_month'
export const storyFields: string =
  'id,title,body,published_at,public_username,public_category,public_tags' +
  richPublicFields
export function validUsername(value: string) {
  return (
    /^[a-z][a-z0-9_]{2,23}$/.test(value) &&
    ![
      'admin',
      'administrator',
      'moderator',
      'support',
      'deardaily',
      'official',
      'security',
    ].includes(value)
  )
}
export function readingTime(body: string) {
  return Math.max(
    1,
    Math.ceil(body.trim().split(/\s+/).filter(Boolean).length / 200),
  )
}
export async function myProfile(
  client: SupabaseClient,
): Promise<PublicProfile | null> {
  const { data, error } = await client.rpc('my_public_profile')
  if (error) throw new Error('Profile unavailable')
  return data
}
export async function saveProfile(
  client: SupabaseClient,
  profile: PublicProfile,
  previous: string | null,
) {
  if (!validUsername(profile.username))
    throw new Error(
      'Choose 3–24 lowercase letters, numbers or underscores, starting with a letter. Reserved names are unavailable.',
    )
  const query = previous
    ? client.from('public_profiles').update(profile).eq('username', previous)
    : client.from('public_profiles').insert(profile)
  // PostgREST representation responses need the hidden primary key. Keep the
  // write minimal, then verify only the approved fields through the own-row RPC.
  const { error } = await query
  if (error)
    throw new Error(
      'Profile not confirmed. Reload before retrying; the username may be unavailable.',
    )
  const saved = await myProfile(client)
  if (
    !saved ||
    !(Object.keys(profile) as (keyof PublicProfile)[]).every(
      (key) => saved[key] === profile[key],
    )
  )
    throw new Error(
      'Profile not confirmed. Reload to reconcile the server version.',
    )
  return saved
}
export async function storyPage(
  client: SupabaseClient,
  options: {
    search?: string
    category?: string
    oldest?: boolean
    page?: number
    username?: string
  } = {},
) {
  let query = client
    .from('public_stories')
    .select<string, CommunityStory>(storyFields)
    .order('published_at', { ascending: Boolean(options.oldest) })
    .order('id', { ascending: Boolean(options.oldest) })
  if (options.search?.trim())
    query = query.ilike(
      'title',
      `%${options.search.trim().replace(/[\\%_]/g, '\\$&')}%`,
    )
  if (options.category) query = query.eq('public_category', options.category)
  if (options.username) query = query.eq('public_username', options.username)
  const offset = (options.page ?? 0) * 12
  const { data, error } = await query.range(offset, offset + 12)
  if (error) throw new Error('Stories unavailable')
  return {
    stories: (data ?? []).slice(0, 12) as CommunityStory[],
    more: (data?.length ?? 0) > 12,
  }
}
export interface ReportItem {
  id: string
  story_id: string
  reason: string
  explanation: string
  created_at: string
  title: string | null
  body: string | null
}
export function downloadJSON(value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = 'deardaily-private-account-export.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Management needs source IDs only; never fetch private journal bodies for this list.
export async function listOwnStoryIds(client: SupabaseClient, userId: string) {
  const ids: string[] = []
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client
      .from('journal_entries')
      .select('id')
      .eq('user_id', userId)
      .order('id')
      .range(offset, offset + 99)
    if (error) throw new Error('Publications unavailable')
    ids.push(...data.map((row) => row.id as string))
    if (data.length < 100) return ids
  }
}
