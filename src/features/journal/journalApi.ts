import {
  documentAssetIds,
  preparePublicPhotos,
  cleanQueuedPhotos,
} from '../media/mediaApi'
import {
  validateDocument,
  publicWritingDocument,
} from '../rich-editor/document'
import { communityEnabled, storyFields } from '../community/communityApi'
import type { StoryMetadata } from '../community/communityApi'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Mood } from '../../data/demo'
import type { WritingDocument, CoverPreset } from '../rich-editor/document'
import { richEditorEnabled, richPublicFields } from '../rich-editor/config'

export const journalEnabled = import.meta.env.VITE_ENABLE_JOURNALS === 'true'
export interface Draft {
  writing_document?: WritingDocument | null
  page_icon?: string | null
  cover_preset?: CoverPreset | null
  title: string
  body: string
  mood: Mood
  tags: string[]
  category: string
  entry_date: string
  status: 'draft' | 'saved'
}
export interface JournalEntry extends Draft {
  id: string
  user_id: string
  version: number
  created_at: string
  updated_at: string
}
export interface PublicStory {
  writing_document?: WritingDocument | null
  page_icon?: string | null
  cover_preset?: CoverPreset | null
  id: string
  title: string
  body: string
  published_at: string
}
export const publicFields: string =
  'id,title,body,published_at' + richPublicFields
const readableFields: string = communityEnabled ? storyFields : publicFields
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function newDraft(): Draft {
  return {
    ...(richEditorEnabled
      ? { writing_document: null, page_icon: null, cover_preset: null }
      : {}),
    title: '',
    body: '',
    mood: 'Calm',
    tags: [],
    category: 'Personal',
    entry_date: localDay(),
    status: 'draft',
  }
}
export function draftOf(row: Draft): Draft {
  return {
    ...(richEditorEnabled
      ? {
          writing_document: row.writing_document ?? null,
          page_icon: row.page_icon ?? null,
          cover_preset: row.cover_preset ?? null,
        }
      : {}),
    title: row.title,
    body: row.body,
    mood: row.mood,
    tags: row.tags,
    category: row.category,
    entry_date: row.entry_date,
    status: row.status,
  }
}
export async function loadEntry(
  client: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data, error } = await client
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .single()
  if (error || !data) throw new Error('Entry unavailable')
  return data as JournalEntry
}
export async function saveEntry(
  client: SupabaseClient,
  userId: string,
  id: string,
  draft: Draft,
  version: number | null,
) {
  const query =
    version === null
      ? client.from('journal_entries').insert({ ...draft, id, user_id: userId })
      : client
          .from('journal_entries')
          .update(draft)
          .eq('id', id)
          .eq('user_id', userId)
          .eq('version', version)
  const { data, error } = await query.select('*').single()
  if (error || !data)
    throw new Error(
      'Save not confirmed. Reload to reconcile a conflict or an uncertain network response.',
    )
  return data as JournalEntry
}
export async function removeEntry(
  client: SupabaseClient,
  userId: string,
  id: string,
  version: number,
) {
  const { data, error } = await client
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .eq('version', version)
    .select('id')
    .single()
  if (error || data?.id !== id) throw new Error('Delete not confirmed')
  // Deleting the entry queues exact private/public objects; never prune unrelated drafts.
  await cleanQueuedPhotos(client).catch(() => {})
}
export async function listEntries(client: SupabaseClient, userId: string) {
  const rows: JournalEntry[] = []
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('id')
      .range(offset, offset + 99)
    if (error) throw new Error('Entries unavailable')
    rows.push(...(data as JournalEntry[]))
    if (data.length < 100) break
  }
  return rows.sort(
    (a, b) =>
      b.entry_date.localeCompare(a.entry_date) ||
      b.updated_at.localeCompare(a.updated_at),
  )
}
export async function readStories(client: SupabaseClient, id?: string) {
  let query = client
    .from('public_stories')
    .select(readableFields)
    .order('published_at', { ascending: false })
    .limit(100)
  if (id) query = query.eq('id', id)
  const { data, error } = await query.returns<PublicStory[]>()
  if (error) throw new Error('Public stories unavailable')
  return data as PublicStory[]
}
export async function publishStory(
  client: SupabaseClient,
  userId: string,
  entry: JournalEntry,
  exists: boolean,
  metadata?: StoryMetadata,
) {
  const publicDocument = documentAssetIds(entry.writing_document).length
    ? validateDocument(
        await preparePublicPhotos(client, entry.id, entry.version),
      )
    : entry.writing_document
  const fields = {
    title: entry.title,
    body: entry.body,
    ...(richEditorEnabled
      ? {
          writing_document: publicDocument
            ? publicWritingDocument(publicDocument)
            : null,
          page_icon: entry.page_icon ?? null,
          cover_preset: entry.cover_preset ?? null,
        }
      : {}),
    ...(communityEnabled && metadata ? metadata : {}),
  }
  const query = exists
    ? client.from('public_stories').update(fields).eq('id', entry.id)
    : client
        .from('public_stories')
        .insert({ ...fields, id: entry.id, user_id: userId })
  const { data, error } = await query
    .select(readableFields)
    .returns<PublicStory[]>()
    .single()
  if (error || data?.id !== entry.id)
    throw new Error('Publication not confirmed')
  void cleanQueuedPhotos(client).catch(() => {})
  return data as PublicStory
}
export async function unpublishStory(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('public_stories')
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  if (error || data?.id !== id) throw new Error('Unpublish not confirmed')
  void cleanQueuedPhotos(client).catch(() => {})
}
export function exportMarkdown(draft: Draft, publicOnly = false) {
  const text =
    `# ${draft.title || 'Untitled entry'}\n\n${draft.body}\n` +
    (publicOnly
      ? ''
      : `\n---\nDate: ${draft.entry_date}\nMood: ${draft.mood}\nCategory: ${draft.category}\nTags: ${draft.tags.join(', ')}\n`)
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/markdown;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = publicOnly
    ? 'deardaily-story-for-review.md'
    : 'deardaily-private-entry.md'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** JSONB reorders object keys; object ordering must never trigger another save. */
export function draftFingerprint(draft: Draft): string {
  return JSON.stringify(draft, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
        )
      : value,
  )
}
