import type { SupabaseClient } from '@supabase/supabase-js'
import { isMediaId } from '../media/mediaApi'
import { validateVoiceNotes, type VoiceNote } from './audio'
export async function uploadVoice(
  client: SupabaseClient,
  entry: string,
  blob: Blob,
) {
  const { data, error } = await client.functions.invoke('voice-gateway', {
    body: blob,
    headers: {
      'Content-Type': 'audio/wav',
      'x-action': 'upload',
      'x-entry-id': entry,
    },
  })
  if (error || !isMediaId(data?.id))
    throw Error('Recording upload not confirmed. Your writing is unchanged.')
  return data.id as string
}
export async function voiceUrl(client: SupabaseClient, id: string) {
  const { data, error } = await client.functions.invoke('voice-gateway', {
    body: { action: 'read', id },
  })
  if (error || typeof data?.url !== 'string')
    throw Error('Recording unavailable')
  const url = new URL(data.url)
  if (
    url.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(url.hostname)
  )
    throw Error('Invalid recording response')
  return url.href
}
export async function preparePublicVoice(
  client: SupabaseClient,
  entry: string,
  version: number,
) {
  const { data, error } = await client.functions.invoke('voice-gateway', {
    body: { action: 'prepare', entry, version },
  })
  if (error)
    throw Error('Public recordings not prepared. Existing story is unchanged.')
  return validateVoiceNotes(data?.notes, false)
}
export async function cleanVoice(client: SupabaseClient) {
  const { data, error } = await client.functions.invoke('voice-gateway', {
    body: { action: 'cleanup' },
  })
  if (error || data?.pending !== 0)
    throw Error('Audio cleanup remains queued for retry')
}
export function approvedVoice(notes?: VoiceNote[]) {
  return (notes ?? []).filter((n) => n.share)
}
