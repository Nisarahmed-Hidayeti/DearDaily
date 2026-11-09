import type { SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import { isMediaId } from '../media/mediaApi'
export const profileImagesEnabled =
  import.meta.env.VITE_ENABLE_PROFILE_IMAGES === 'true'
export type ImageSlot = 'avatar' | 'banner'
export interface ProfileImages {
  avatar_asset: string | null
  banner_asset: string | null
  share_avatar: boolean
  share_banner: boolean
  banner_position: number
  version: number
}
export interface PublicImages {
  avatar: string | null
  banner: string | null
  banner_position: number
}
export const emptyImages: ProfileImages = {
  avatar_asset: null,
  banner_asset: null,
  share_avatar: false,
  share_banner: false,
  banner_position: 50,
  version: 0,
}
export function validateImages(value: unknown): ProfileImages {
  const v = value as ProfileImages
  if (
    !v ||
    ![v.avatar_asset, v.banner_asset].every(
      (id) => id === null || isMediaId(id),
    ) ||
    typeof v.share_avatar !== 'boolean' ||
    typeof v.share_banner !== 'boolean' ||
    !Number.isSafeInteger(v.version) ||
    v.version < 0 ||
    !Number.isInteger(v.banner_position) ||
    v.banner_position < 0 ||
    v.banner_position > 100
  )
    throw Error('Profile images unavailable')
  return {
    avatar_asset: v.avatar_asset,
    banner_asset: v.banner_asset,
    share_avatar: v.share_avatar,
    share_banner: v.share_banner,
    banner_position: v.banner_position,
    version: v.version,
  }
}
export async function ownImages(client: SupabaseClient) {
  const r = await client.rpc('my_profile_images')
  if (r.error) throw Error('Could not load profile photos. Reload to retry.')
  return validateImages(r.data)
}
export async function publicImages(
  client: SupabaseClient,
  handle: string,
): Promise<PublicImages | null> {
  const r = await client.rpc('public_profile_images', { handle })
  if (r.error || !r.data) return null
  const v = r.data as PublicImages
  if (
    ![v.avatar, v.banner].every((id) => id === null || isMediaId(id)) ||
    !Number.isInteger(v.banner_position) ||
    v.banner_position < 0 ||
    v.banner_position > 100
  )
    return null
  return v
}
export async function privateProfileImage(client: SupabaseClient, id: string) {
  if (!isMediaId(id)) throw Error('Photo unavailable')
  const r = await client.functions.invoke('media-gateway', {
    body: { action: 'profile-read', id },
  })
  if (r.error || typeof r.data?.url !== 'string')
    throw Error('Photo unavailable')
  const u = new URL(r.data.url)
  if (
    u.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(u.hostname)
  )
    throw Error('Photo unavailable')
  return u.href
}
export function publicProfileImage(id: string) {
  return authConfig && isMediaId(id)
    ? `${authConfig.url}/functions/v1/media-gateway?profile=${id}`
    : null
}
export async function uploadProfileImage(
  client: SupabaseClient,
  slot: ImageSlot,
  blob: Blob,
) {
  if (blob.type !== 'image/webp' || blob.size > 2097152)
    throw Error('Prepared photo exceeds the 2 MiB limit')
  const r = await client.functions.invoke('media-gateway', {
    body: blob,
    headers: {
      'Content-Type': 'image/webp',
      'x-action': 'profile-upload',
      'x-profile-kind': slot,
    },
  })
  if (r.error || !isMediaId(r.data?.id))
    throw Error('Photo upload not confirmed. Retry when connected.')
  return r.data.id as string
}
export async function saveImages(client: SupabaseClient, value: ProfileImages) {
  const r = await client.functions.invoke('media-gateway', {
    body: { action: 'profile-save', ...validateImages(value) },
  })
  if (r.error)
    throw Error(
      'Profile photos were not confirmed. Reload before retrying; another tab may have newer changes.',
    )
  const result = validateImages(r.data?.settings)
  if (
    result.version !== value.version + 1 ||
    result.avatar_asset !== value.avatar_asset ||
    result.banner_asset !== value.banner_asset ||
    result.share_avatar !== value.share_avatar ||
    result.share_banner !== value.share_banner ||
    result.banner_position !== value.banner_position
  )
    throw Error('Reload to reconcile the saved profile photos.')
  window.dispatchEvent(new Event('deardaily:profile-images'))
  return result
}
