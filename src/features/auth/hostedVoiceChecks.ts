import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import { encodeWav, voiceNotesEnabled, type VoiceNote } from '../audio/audio'
import {
  uploadVoice,
  voiceUrl,
  preparePublicVoice,
  cleanVoice,
} from '../audio/audioApi'
import {
  newDraft,
  draftOf,
  saveEntry,
  publishStory,
  unpublishStory,
} from '../journal/journalApi'
export async function hostedVoiceChecks(
  a: SupabaseClient,
  b: SupabaseClient,
  aId: string,
  bId: string,
) {
  const anonymous = createClient(authConfig!.url, authConfig!.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const ids = [crypto.randomUUID(), crypto.randomUUID()],
    marker = 'Synthetic voice gate ' + crypto.randomUUID()
  let checks = 0,
    stage = 'identity',
    passed = false,
    cleanup = true,
    failure = ''
  const check = (ok: unknown) => {
    if (!ok) throw Error(`Check ${checks + 1} failed`)
    checks++
  }
  try {
    check(voiceNotesEnabled)
    const [first, second] = await Promise.all([
      a.auth.getUser(),
      b.auth.getUser(),
    ])
    check(
      !first.error &&
        !second.error &&
        first.data.user?.id === aId &&
        second.data.user?.id === bId &&
        aId !== bId,
    )
    const ownerAccess = await a.rpc('my_owner_access')
    check(!ownerAccess.error && ownerAccess.data?.owner === true)
    stage = 'private audio save and isolation'
    let row = await saveEntry(
      a,
      aId,
      ids[0],
      {
        ...newDraft(),
        title: marker,
        body: 'Synthetic audio text only',
        status: 'saved',
      },
      null,
    )
    const other = await saveEntry(
      b,
      bId,
      ids[1],
      {
        ...newDraft(),
        title: marker + ' B',
        body: 'Synthetic B',
        status: 'saved',
      },
      null,
    )
    const wav = encodeWav(new Float32Array(320000).fill(0.25)),
      id = await uploadVoice(a, row.id, wav)
    check(!!id)
    const bDirect = await b.storage
      .from('deardaily-voice-private')
      .download(id + '.wav')
    check(!!bDirect.error)
    const aDirect = await a.storage
      .from('deardaily-voice-private')
      .download(id + '.wav')
    check(!!aDirect.error)
    const bSign = await b.storage
      .from('deardaily-voice-private')
      .createSignedUrl(id + '.wav', 60)
    check(!!bSign.error)
    const anonList = await anonymous.storage
      .from('deardaily-voice-private')
      .list()
    check(!!anonList.error || anonList.data?.length === 0)
    let note: VoiceNote = {
      id,
      title: 'Approved synthetic excerpt',
      start: 10,
      end: 19,
      share: false,
    }
    row = await saveEntry(
      a,
      aId,
      row.id,
      { ...draftOf(row), voice_notes: [note] },
      row.version,
    )
    check(row.voice_notes?.[0].end === 19)
    const bAudio = await uploadVoice(b, other.id, wav)
    check(!!bAudio && bAudio !== id)
    const bNote: VoiceNote = {
      id: bAudio,
      title: 'Private B recording',
      start: 0,
      end: 2,
      share: false,
    }
    const bSaved = await saveEntry(
      b,
      bId,
      other.id,
      { ...draftOf(other), voice_notes: [bNote] },
      other.version,
    )
    check(bSaved.voice_notes?.[0].id === bAudio)
    let ownerBlocked = false
    try {
      await voiceUrl(a, bAudio)
    } catch {
      ownerBlocked = true
    }
    check(ownerBlocked)
    const ownerPrivate = await a
      .from('journal_entries')
      .select('id,voice_notes')
      .eq('id', other.id)
    check(!ownerPrivate.error && ownerPrivate.data?.length === 0)
    const ownerSpoof = await a
      .from('journal_entries')
      .update({ voice_notes: [bNote] })
      .eq('id', row.id)
    check(!!ownerSpoof.error)
    const hidden = await b
      .from('journal_entries')
      .select('id,voice_notes')
      .eq('id', row.id)
    check(!hidden.error && hidden.data?.length === 0)
    let blocked = false
    try {
      await voiceUrl(b, id)
    } catch {
      blocked = true
    }
    check(blocked)
    blocked = false
    try {
      await uploadVoice(b, row.id, wav)
    } catch {
      blocked = true
    }
    check(blocked)
    const spoof = await b
      .from('journal_entries')
      .update({ voice_notes: [note] })
      .eq('id', other.id)
    check(!!spoof.error)
    const anonPrivate = await anonymous.functions.invoke('voice-gateway', {
      body: { action: 'read', id },
    })
    check(!!anonPrivate.error)
    const anonRows = await anonymous
      .from('journal_entries')
      .select('voice_notes')
      .eq('id', row.id)
    check(!!anonRows.error || anonRows.data?.length === 0)
    check((await preparePublicVoice(a, row.id, row.version)).length === 0)
    check((await voiceUrl(a, id)).startsWith('https://'))
    stage = 'explicit public excerpt'
    note = { ...note, share: true }
    row = await saveEntry(
      a,
      aId,
      row.id,
      { ...draftOf(row), voice_notes: [note] },
      row.version,
    )
    const published = await publishStory(a, aId, row, false)
    const copy = published.voice_notes?.[0]
    check(!!copy && copy.id !== id && !('share' in copy))
    check(copy!.start === 10 && copy!.end === 19)
    const read = await anonymous
      .from('public_stories')
      .select('voice_notes')
      .eq('id', row.id)
      .single()
    check(!read.error && read.data.voice_notes[0].id === copy!.id)
    const leak = await anonymous
      .from('public_stories')
      .select('user_id')
      .eq('id', row.id)
    check(!!leak.error)
    const directPublic = await anonymous.storage
      .from('deardaily-voice-public')
      .download(copy!.id + '.wav')
    check(!!directPublic.error)
    const getPublic = () =>
      fetch(
        `${authConfig!.url}/functions/v1/voice-gateway?public=${copy!.id}`,
        { cache: 'no-store', credentials: 'omit' },
      )
    const response = await getPublic()
    check(response.ok)
    const bytes = await response.arrayBuffer()
    check(bytes.byteLength === 9 * 32000 + 44)
    const view = new DataView(bytes)
    check(view.getUint32(40, true) === 9 * 32000)
    const privatePublic = await fetch(
      `${authConfig!.url}/functions/v1/voice-gateway?public=${id}`,
      { cache: 'no-store', credentials: 'omit' },
    )
    check(privatePublic.status === 404)
    const unapproved = await a
      .from('public_stories')
      .update({ voice_notes: [{ ...copy, start: 0 }] })
      .eq('id', row.id)
    check(!!unapproved.error)
    const bEdit = await b
      .from('public_stories')
      .update({ voice_notes: [] })
      .eq('id', row.id)
      .select('id')
    check(!bEdit.error && bEdit.data?.length === 0)
    const still = await getPublic()
    check(still.ok)
    stage = 'independent snapshot and unpublishing'
    row = await saveEntry(
      a,
      aId,
      row.id,
      { ...draftOf(row), voice_notes: [] },
      row.version,
    )
    const independent = await getPublic()
    check(independent.ok)
    await unpublishStory(a, row.id)
    check((await getPublic()).status === 404)
    const gone = await anonymous
      .from('public_stories')
      .select('voice_notes')
      .eq('id', row.id)
    check(!gone.error && gone.data?.length === 0)
    check((await voiceUrl(a, id)).startsWith('https://'))
    passed = true
    stage = 'complete'
  } catch (e) {
    failure = e instanceof Error ? e.message : 'Verification interrupted'
  } finally {
    for (const [client, id, who] of [
      [a, ids[0], aId],
      [b, ids[1], bId],
    ] as const) {
      const pub = await client.from('public_stories').delete().eq('id', id)
      if (pub.error) cleanup = false
      const removed = await client
        .from('journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', who)
      if (removed.error) cleanup = false
      await cleanVoice(client).catch(() => {
        cleanup = false
      })
      const remains = await client
        .from('journal_entries')
        .select('id')
        .eq('id', id)
      if (remains.error || remains.data?.length) cleanup = false
    }
  }
  return {
    passed: passed && cleanup,
    checks,
    distinctIdentities: aId !== bId,
    cleanup,
    stage,
    failure,
    marker,
    fixtureEntryIds: ids,
  }
}
