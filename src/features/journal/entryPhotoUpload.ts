import type { SupabaseClient } from '@supabase/supabase-js'
import { mediaEnabled, uploadPhoto } from '../media/mediaApi'
import { validateImageInput } from '../media/imageSafety'
import type { JournalEntry } from './journalApi'
/** An intentional upload may create a private draft, but only after file validation.
 * Never upload without a backend-confirmed owner row; preserve the stable entry ID. */
export async function uploadEntryPhoto(
  client: SupabaseClient,
  file: File,
  count: number,
  entry: JournalEntry | null,
  save: () => Promise<JournalEntry | undefined>,
) {
  if (!mediaEnabled) throw Error('Private photo storage is not enabled yet')
  validateImageInput(
    file,
    new Uint8Array(await file.slice(0, 16).arrayBuffer()),
    count,
  )
  const confirmed = entry ?? (await save())
  if (!confirmed)
    throw Error(
      'Private draft creation was not confirmed. No photo was uploaded. Reconnect and retry saving.',
    )
  return uploadPhoto(client, confirmed.id, file, count)
}
