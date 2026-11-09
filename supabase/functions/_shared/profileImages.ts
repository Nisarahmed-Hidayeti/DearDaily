import type { SupabaseClient } from '@supabase/supabase-js'
import { readBounded, sanitizePhoto } from './image.ts'
const uuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
const optionalId = (v: unknown) => v === null || uuid(v)
export function profileImageSave(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid profile images')
  const b = value as Record<string, unknown>
  if (
    Object.keys(b).some(
      (k) =>
        ![
          'action',
          'avatar_asset',
          'banner_asset',
          'share_avatar',
          'share_banner',
          'banner_position',
          'version',
        ].includes(k),
    ) ||
    !optionalId(b.avatar_asset) ||
    !optionalId(b.banner_asset) ||
    typeof b.share_avatar !== 'boolean' ||
    typeof b.share_banner !== 'boolean' ||
    !Number.isSafeInteger(b.banner_position) ||
    Number(b.banner_position) < 0 ||
    Number(b.banner_position) > 100 ||
    !Number.isSafeInteger(b.version) ||
    Number(b.version) < 0 ||
    (b.share_avatar && !b.avatar_asset) ||
    (b.share_banner && !b.banner_asset)
  )
    throw Error('Invalid profile images')
  return b as {
    avatar_asset: string | null
    banner_asset: string | null
    share_avatar: boolean
    share_banner: boolean
    banner_position: number
    version: number
  }
}
export async function profilePublicImage(admin: SupabaseClient, id: string) {
  if (!uuid(id)) return null
  const record = await admin.rpc('public_profile_image_record', { media: id })
  if (record.error || typeof record.data !== 'string') return null
  const signed = await admin.storage
    .from('deardaily-story-media')
    .createSignedUrl(record.data, 60)
  return signed.error ? null : (signed.data?.signedUrl ?? null)
}
export async function profileMediaRequest(
  request: Request,
  admin: SupabaseClient,
  client: SupabaseClient,
  who: string,
  body?: Record<string, unknown>,
) {
  if (request.headers.get('x-action') === 'profile-upload') {
    const kind = request.headers.get('x-profile-kind')
    if (kind !== 'avatar' && kind !== 'banner')
      throw Error('Invalid image slot')
    const photo = sanitizePhoto(
      await readBounded(request),
      request.headers.get('content-type') ?? '',
    )
    if (
      photo.bytes.length > 2097152 ||
      (kind === 'avatar' && (photo.width !== 512 || photo.height !== 512))
    )
      throw Error('Invalid profile dimensions or size')
    const id = crypto.randomUUID()
    const reserve = await client.rpc('reserve_profile_image', {
      media: id,
      slot: kind,
      byte_count: photo.bytes.length,
    })
    if (reserve.error)
      throw Error('Profile image quota reached or upload unavailable')
    const key = 'profile/' + who + '/' + id + '.webp'
    try {
      const upload = await admin.storage
        .from('deardaily-private')
        .upload(key, photo.bytes, {
          contentType: 'image/webp',
          upsert: false,
          cacheControl: '0',
        })
      if (upload.error) throw Error('Upload unavailable')
      const ready = await admin
        .from('profile_image_assets')
        .update({ status: 'ready', width: photo.width, height: photo.height })
        .eq('id', id)
        .eq('user_id', who)
        .select('id')
        .single()
      if (ready.error || !ready.data) throw Error('Upload not confirmed')
      return { id }
    } catch {
      await admin
        .from('profile_image_assets')
        .delete()
        .eq('id', id)
        .eq('user_id', who)
      throw Error('Upload not confirmed; retry when connected')
    }
  }
  if (body?.action === 'profile-read' && uuid(body.id)) {
    const asset = await admin
      .from('profile_image_assets')
      .select('object_key')
      .eq('id', body.id)
      .eq('user_id', who)
      .eq('status', 'ready')
      .maybeSingle()
    if (asset.error || !asset.data) throw Error('Profile image unavailable')
    const signed = await admin.storage
      .from('deardaily-private')
      .createSignedUrl(asset.data.object_key, 60)
    if (signed.error || !signed.data) throw Error('Profile image unavailable')
    return { url: signed.data.signedUrl }
  }
  if (body?.action === 'profile-save') {
    const input = profileImageSave(body),
      created: string[] = []
    const prepare = async (id: string | null, share: boolean, kind: string) => {
      if (!id || !share) return null
      const source = await admin
        .from('profile_image_assets')
        .select('object_key')
        .eq('id', id)
        .eq('user_id', who)
        .eq('kind', kind)
        .eq('status', 'ready')
        .single()
      if (source.error || !source.data) throw Error('Profile image unavailable')
      const copy = crypto.randomUUID()
      const reserved = await admin.rpc('reserve_profile_image_copy', {
        who,
        asset: id,
        copy,
      })
      if (reserved.error || typeof reserved.data !== 'string')
        throw Error('Public image quota reached')
      created.push(copy)
      const blob = await admin.storage
        .from('deardaily-private')
        .download(source.data.object_key)
      if (blob.error || !blob.data) throw Error('Profile image unavailable')
      const upload = await admin.storage
        .from('deardaily-story-media')
        .upload(reserved.data, blob.data, {
          contentType: 'image/webp',
          upsert: false,
          cacheControl: '0',
        })
      if (upload.error) throw Error('Public image not prepared')
      return copy
    }
    try {
      const avatar = await prepare(
          input.avatar_asset,
          input.share_avatar,
          'avatar',
        ),
        banner = await prepare(input.banner_asset, input.share_banner, 'banner')
      const saved = await admin.rpc('commit_profile_images', {
        who,
        expected_version: input.version,
        avatar: input.avatar_asset,
        banner: input.banner_asset,
        public_avatar: avatar,
        public_banner: banner,
        focal: input.banner_position,
      })
      if (saved.error)
        throw Error(
          'Images changed or public profile is hidden. Reload before saving.',
        )
      const own = await client.rpc('my_profile_images')
      if (own.error)
        throw Error('Saved images need reconciliation. Reload to check.')
      return { settings: own.data }
    } catch (e) {
      // A successful commit can precede a lost response. Never remove currently referenced copies.
      for (const id of created) {
        const authorized = await admin.rpc('public_profile_image_record', {
          media: id,
        })
        if (!authorized.error && !authorized.data)
          await admin
            .from('profile_image_copies')
            .delete()
            .eq('id', id)
            .eq('user_id', who)
      }
      throw e
    }
  }
  if (body?.action === 'profile-cleanup') {
    const pruned = await client.rpc('prune_profile_images')
    if (pruned.error) throw Error('Cleanup not confirmed')
    const jobs = await admin
      .from('media_gc')
      .select('id,bucket,object_key')
      .eq('user_id', who)
      .like('object_key', 'profile/%')
      .limit(50)
    if (jobs.error) throw Error('Cleanup unavailable')
    for (const job of jobs.data ?? []) {
      const removed = await admin.storage
        .from(job.bucket)
        .remove([job.object_key])
      if (!removed.error)
        await admin
          .from('media_gc')
          .delete()
          .eq('id', job.id)
          .eq('user_id', who)
    }
    return { cleaned: true }
  }
  throw Error('Unsupported profile image request')
}
