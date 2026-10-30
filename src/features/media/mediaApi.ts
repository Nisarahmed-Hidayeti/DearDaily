import type { SupabaseClient } from '@supabase/supabase-js'
import { validateImageInput, validateImageDimensions } from './imageSafety'
export const mediaEnabled = import.meta.env.VITE_ENABLE_MEDIA === 'true'
export const isMediaId = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
export function documentAssetIds(document: unknown) {
  const ids = new Set<string>()
  const walk = (v: unknown) => {
    if (!v || typeof v !== 'object') return
    const n = v as {
      type?: string
      attrs?: { assetId?: unknown }
      content?: unknown[]
    }
    if (n.type === 'journalImage' && isMediaId(n.attrs?.assetId))
      ids.add(n.attrs.assetId)
    n.content?.forEach(walk)
  }
  const d = document as {
    content?: unknown
    page?: { assetId?: unknown }
  } | null
  walk(d?.content)
  if (isMediaId(d?.page?.assetId)) ids.add(d.page.assetId)
  return [...ids]
}
export async function uploadPhoto(
  client: SupabaseClient,
  entry: string,
  file: File,
  count: number,
) {
  if (!mediaEnabled) throw Error('Private photo storage is not enabled yet')
  validateImageInput(
    file,
    new Uint8Array(await file.slice(0, 16).arrayBuffer()),
    count,
  )
  const bitmap = await createImageBitmap(file)
  try {
    validateImageDimensions(bitmap.width, bitmap.height)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)),
      canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw Error('Photo preparation unavailable')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(Error('Could not prepare photo'))),
        'image/webp',
        0.85,
      ),
    )
    if (blob.size > 5 * 1024 * 1024) throw Error('Prepared photo is too large')
    const { data, error } = await client.functions.invoke('media-gateway', {
      body: blob,
      headers: {
        'Content-Type': 'image/webp',
        'x-action': 'upload',
        'x-entry-id': entry,
      },
    })
    if (error || !isMediaId(data?.id)) throw Error('Photo upload not confirmed')
    return data.id as string
  } finally {
    bitmap.close()
  }
}
export async function privatePhotoUrl(client: SupabaseClient, id: string) {
  if (!mediaEnabled || !isMediaId(id)) throw Error('Photo unavailable')
  const { data, error } = await client.functions.invoke('media-gateway', {
    body: { action: 'read', id },
  })
  if (error || typeof data?.url !== 'string') throw Error('Photo unavailable')
  const url = new URL(data.url)
  if (
    url.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(url.hostname)
  )
    throw Error('Invalid photo response')
  return data.url as string
}
export async function preparePublicPhotos(
  client: SupabaseClient,
  entry: string,
  version: number,
) {
  if (!mediaEnabled) throw Error('Public photo preparation is not enabled')
  const { data, error } = await client.functions.invoke('media-gateway', {
    body: { action: 'prepare', entry, version },
  })
  if (error || !data?.document)
    throw Error(
      'Public photos could not be prepared. Existing public story is unchanged.',
    )
  return data.document as unknown
}
export async function cleanQueuedPhotos(client: SupabaseClient, prune = false) {
  if (!mediaEnabled) return
  const { error } = await client.functions.invoke('media-gateway', {
    body: { action: 'cleanup', prune },
  })
  if (error && prune) throw Error('Cleanup not confirmed')
}
