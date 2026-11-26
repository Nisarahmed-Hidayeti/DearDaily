import {
  voiceNotesEnabled,
  validateVoiceNotes,
  type VoiceNote,
} from '../audio/audio'
import { preparePublicVoice, cleanVoice } from '../audio/audioApi'
import {
  documentAssetIds,
  preparePublicPhotos,
  cleanQueuedPhotos,
} from '../media/mediaApi'
import {
  persistentMusicEnabled,
  musicFields,
  publicMusic,
  validateMusic,
  type PrivateMusic,
  type StoryMusic,
} from '../music/music'
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
import { formatLocalDate, parseLocalDate } from '../../lib/dates'

export const journalEnabled = import.meta.env.VITE_ENABLE_JOURNALS === 'true'
export interface Draft {
  voice_notes?: VoiceNote[]
  music?: PrivateMusic | null
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
  voice_notes?: VoiceNote[]
  music?: StoryMusic | null
  writing_document?: WritingDocument | null
  page_icon?: string | null
  cover_preset?: CoverPreset | null
  id: string
  title: string
  body: string
  published_at: string
}
export const publicFields: string =
  'id,title,body,published_at' +
  richPublicFields +
  musicFields +
  (voiceNotesEnabled ? ',voice_notes' : '')
const readableFields: string = communityEnabled ? storyFields : publicFields
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function entryTitle(title: string, entryDate: string): string {
  return title.trim() || formatLocalDate(parseLocalDate(entryDate))
}
export function newDraft(): Draft {
  const entry_date = localDay()
  return {
    ...(voiceNotesEnabled ? { voice_notes: [] } : {}),
    ...(persistentMusicEnabled ? { music: null } : {}),
    ...(richEditorEnabled
      ? { writing_document: null, page_icon: null, cover_preset: null }
      : {}),
    title: '',
    body: '',
    mood: 'Calm',
    tags: [],
    category: 'Personal',
    entry_date,
    status: 'draft',
  }
}
export function draftOf(row: Draft): Draft {
  return {
    ...(voiceNotesEnabled ? { voice_notes: row.voice_notes ?? [] } : {}),
    ...(persistentMusicEnabled ? { music: row.music ?? null } : {}),
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
export class JournalSaveError extends Error {
  constructor(readonly kind: 'retryable' | 'conflict' | 'auth' | 'failed') {
    super(
      {
        retryable:
          'Cloud save not confirmed. Your latest edits can be retried.',
        conflict:
          'The cloud entry may have changed. Keep your recovery copy and reload before saving again.',
        auth: 'Sign in again to save your changes to the cloud.',
        failed: 'Cloud save not confirmed. Keep or export your recovery copy.',
      }[kind],
    )
  }
}

export async function saveEntry(
  client: SupabaseClient,
  userId: string,
  id: string,
  draft: Draft,
  version: number | null,
) {
  const savedDraft = {
    ...draft,
    title: entryTitle(draft.title, draft.entry_date),
  }
  if (draft.voice_notes) validateVoiceNotes(draft.voice_notes)
  if (draft.music) validateMusic(draft.music, true)
  const query =
    version === null
      ? client
          .from('journal_entries')
          .insert({ ...savedDraft, id, user_id: userId })
      : client
          .from('journal_entries')
          .update(savedDraft)
          .eq('id', id)
          .eq('user_id', userId)
          .eq('version', version)
  const { data, error, status } = await query.select('*').single()
  if (error || !data) {
    if (status === 401 || status === 403) throw new JournalSaveError('auth')
    if (error?.code === 'PGRST116' || error?.code === '23505')
      throw new JournalSaveError('conflict')
    if (status === 0 || status === 408 || status === 429 || status >= 500)
      throw new JournalSaveError('retryable')
    throw new JournalSaveError('failed')
  }
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
  if (voiceNotesEnabled) void cleanVoice(client).catch(() => {})
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
export type EntrySummary = Pick<
  JournalEntry,
  | 'id'
  | 'title'
  | 'body'
  | 'entry_date'
  | 'status'
  | 'tags'
  | 'mood'
  | 'writing_document'
  | 'page_icon'
  | 'cover_preset'
>

export async function listEntrySummaries(
  client: SupabaseClient,
  userId: string,
) {
  const rows: EntrySummary[] = []
  const fields =
    'id,title,body,entry_date,status,tags,mood' +
    (richEditorEnabled
      ? ',page_icon,cover_preset,cover:writing_document->page,icon:writing_document->>icon'
      : '')
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client
      .from('journal_entries')
      .select(fields)
      .eq('user_id', userId)
      .order('id')
      .range(offset, offset + 99)
      .returns<
        (Omit<EntrySummary, 'writing_document'> & {
          cover?: WritingDocument['page']
          icon?: string | null
        })[]
      >()
    if (error) throw new Error('Entries unavailable')
    for (const { cover, icon, ...entry } of data)
      rows.push({
        ...entry,
        writing_document:
          cover || icon
            ? {
                version: 1,
                content: { type: 'doc' },
                page: cover ?? undefined,
                icon: icon ?? undefined,
              }
            : null,
      })
    if (data.length < 100) return rows
  }
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
  const expectedVoiceCount =
    metadata?.share_voice_notes === false
      ? 0
      : (entry.voice_notes ?? []).filter((note) => note.share === true).length
  const voiceCopies =
    voiceNotesEnabled && expectedVoiceCount > 0
      ? await preparePublicVoice(client, entry.id, entry.version)
      : []
  if (
    voiceNotesEnabled &&
    (voiceCopies.length !== expectedVoiceCount ||
      (metadata?.share_voice_notes === true &&
        expectedVoiceCount !== (entry.voice_notes?.length ?? 0)))
  )
    throw new Error(
      'Voice notes could not be copied. Your public story was not changed.',
    )
  const fields = {
    ...(voiceNotesEnabled ? { voice_notes: voiceCopies } : {}),
    ...(persistentMusicEnabled ? { music: publicMusic(entry.music) } : {}),
    title: entryTitle(entry.title, entry.entry_date),
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
    ...(communityEnabled && metadata
      ? Object.fromEntries(
          Object.entries(metadata).filter(
            ([key]) => key !== 'share_voice_notes',
          ),
        )
      : {}),
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
  if (voiceNotesEnabled) void cleanVoice(client).catch(() => {})
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
  if (voiceNotesEnabled) void cleanVoice(client).catch(() => {})
  void cleanQueuedPhotos(client).catch(() => {})
}
export function exportMarkdown(draft: Draft, publicOnly = false) {
  const text =
    `# ${entryTitle(draft.title, draft.entry_date)}\n\n${draft.body}\n` +
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
