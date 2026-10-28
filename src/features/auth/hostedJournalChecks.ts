import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import {
  loadEntry,
  newDraft,
  publishStory,
  readStories,
  removeEntry,
  saveEntry,
  unpublishStory,
} from '../journal/journalApi'

export async function hostedJournalChecks(
  A: SupabaseClient,
  B: SupabaseClient,
  a: string,
  b: string,
) {
  let checks = 0,
    stage = 'identity'
  const check = (condition: boolean) => {
    if (!condition) throw new Error(`${stage}: check ${checks + 1} failed`)
    checks++
  }
  const anon = createClient(authConfig!.url, authConfig!.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const aid = crypto.randomUUID(),
    bid = crypto.randomUUID()
  let failure = ''
  let cleanup = true
  try {
    const au = await A.auth.getUser(),
      bu = await B.auth.getUser()
    check(
      !au.error &&
        !bu.error &&
        au.data.user?.id === a &&
        bu.data.user?.id === b &&
        a !== b,
    )
    stage = 'private drafts'
    let entryA = await saveEntry(
      A,
      a,
      aid,
      {
        ...newDraft(),
        title: 'Synthetic A private draft',
        body: 'Synthetic A private words',
        tags: ['private-A'],
      },
      null,
    )
    checks++
    let entryB = await saveEntry(
      B,
      b,
      bid,
      {
        ...newDraft(),
        title: 'Synthetic B private draft',
        body: 'Synthetic B private words',
        tags: ['private-B'],
      },
      null,
    )
    checks++
    check((await loadEntry(A, a, aid)).body === 'Synthetic A private words')
    check((await loadEntry(B, b, bid)).body === 'Synthetic B private words')
    for (const id of [aid, bid])
      check((await readStories(anon, id)).length === 0)
    stage = 'cross-account isolation'
    for (const [client, own, other, owner] of [
      [A, aid, bid, a],
      [B, bid, aid, b],
    ] as const) {
      const read = await client
        .from('journal_entries')
        .select('id,body')
        .eq('id', other)
      check(!read.error && read.data?.length === 0)
      const edit = await client
        .from('journal_entries')
        .update({ body: 'cross-user attack' })
        .eq('id', other)
        .select('id')
      check(!edit.error && edit.data?.length === 0)
      const del = await client
        .from('journal_entries')
        .delete()
        .eq('id', other)
        .select('id')
      check(!del.error && del.data?.length === 0)
      const spoof = await client
        .from('journal_entries')
        .insert({ id: crypto.randomUUID(), user_id: owner === a ? b : a })
      check(Boolean(spoof.error))
      const move = await client
        .from('journal_entries')
        .update({ user_id: owner === a ? b : a })
        .eq('id', own)
      check(Boolean(move.error))
      const version = await client
        .from('journal_entries')
        .update({ version: 999 })
        .eq('id', own)
      check(Boolean(version.error))
    }
    check((await loadEntry(A, a, aid)).body === 'Synthetic A private words')
    check((await loadEntry(B, b, bid)).body === 'Synthetic B private words')
    stage = 'anonymous private denial'
    const read = await anon.from('journal_entries').select('id,body')
    check(Boolean(read.error))
    const insert = await anon
      .from('journal_entries')
      .insert({ id: crypto.randomUUID() })
    check(Boolean(insert.error))
    const edit = await anon
      .from('journal_entries')
      .update({ body: 'anonymous attack' })
      .eq('id', aid)
    check(Boolean(edit.error))
    const del = await anon.from('journal_entries').delete().eq('id', aid)
    check(Boolean(del.error))
    stage = 'saving and stale revisions'
    entryA = await saveEntry(
      A,
      a,
      aid,
      {
        ...newDraft(),
        title: 'Synthetic public story',
        body: 'Deliberately published synthetic words',
        status: 'saved',
      },
      entryA.version,
    )
    checks++
    entryB = await saveEntry(
      B,
      b,
      bid,
      { ...newDraft(), title: entryB.title, body: 'B newer private words' },
      entryB.version,
    )
    checks++
    let staleRejected = false
    try {
      await saveEntry(A, a, aid, { ...newDraft(), body: 'stale attack' }, 1)
    } catch {
      staleRejected = true
    }
    check(staleRejected)
    check(
      (await loadEntry(A, a, aid)).body ===
        'Deliberately published synthetic words',
    )
    stage = 'explicit publication'
    await publishStory(A, a, entryA, false)
    checks++
    const visible = await readStories(anon, aid)
    check(
      visible.length === 1 &&
        visible[0].body === 'Deliberately published synthetic words',
    )
    check(
      Object.keys(visible[0]).sort().join(',') === 'body,id,published_at,title',
    )
    check((await readStories(anon, bid)).length === 0)
    const wildcard = await anon.from('public_stories').select('*').eq('id', aid)
    check(Boolean(wildcard.error))
    const hidden = await anon
      .from('public_stories')
      .select('user_id')
      .eq('id', aid)
    check(Boolean(hidden.error))
    const joined = await anon
      .from('public_stories')
      .select('id,journal_entries(body)')
      .eq('id', aid)
    check(Boolean(joined.error))
    stage = 'public mutation isolation'
    const crossUpdate = await B.from('public_stories')
      .update({ body: 'B attack' })
      .eq('id', aid)
      .select('id')
    check(!crossUpdate.error && crossUpdate.data?.length === 0)
    const crossDelete = await B.from('public_stories')
      .delete()
      .eq('id', aid)
      .select('id')
    check(!crossDelete.error && crossDelete.data?.length === 0)
    const crossPublish = await B.from('public_stories').insert({
      id: bid,
      user_id: a,
      title: 'spoof',
      body: 'spoof',
    })
    check(Boolean(crossPublish.error))
    const wrongEntry = await B.from('public_stories').insert({
      id: aid,
      user_id: b,
      title: 'spoof',
      body: 'spoof',
    })
    check(Boolean(wrongEntry.error))
    const anonInsert = await anon
      .from('public_stories')
      .insert({ id: bid, user_id: b, title: 'spoof', body: 'spoof' })
    check(Boolean(anonInsert.error))
    const anonEdit = await anon
      .from('public_stories')
      .update({ body: 'attack' })
      .eq('id', aid)
    check(Boolean(anonEdit.error))
    const anonDelete = await anon.from('public_stories').delete().eq('id', aid)
    check(Boolean(anonDelete.error))
    stage = 'private edits stay private'
    entryA = await saveEntry(
      A,
      a,
      aid,
      {
        ...newDraft(),
        title: 'Synthetic public story',
        body: 'NEW PRIVATE DRAFT — NEVER PUBLIC',
      },
      entryA.version,
    )
    checks++
    check(
      (await readStories(anon, aid))[0]?.body ===
        'Deliberately published synthetic words',
    )
    check(
      (await loadEntry(A, a, aid)).body === 'NEW PRIVATE DRAFT — NEVER PUBLIC',
    )
    check((await loadEntry(B, b, bid)).body === 'B newer private words')
    stage = 'unpublish'
    await unpublishStory(A, aid)
    checks++
    check((await readStories(anon, aid)).length === 0)
    check(
      (await loadEntry(A, a, aid)).body === 'NEW PRIVATE DRAFT — NEVER PUBLIC',
    )
    stage = 'delete and publication cascade'
    await publishStory(
      A,
      a,
      { ...entryA, title: 'Synthetic republish', body: 'Explicit public copy' },
      false,
    )
    checks++
    await removeEntry(A, a, aid, entryA.version)
    checks++
    check((await readStories(anon, aid)).length === 0)
    await removeEntry(B, b, bid, entryB.version)
    checks++
  } catch (error) {
    failure = error instanceof Error ? error.message : 'Request failed'
  } finally {
    for (const [client, owner, id] of [
      [A, a, aid],
      [B, b, bid],
    ] as const) {
      const removed = await client
        .from('journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', owner)
      const remaining = await client
        .from('journal_entries')
        .select('id')
        .eq('id', id)
      const publicRemaining = await readStories(anon, id).catch(() => null)
      if (
        removed.error ||
        remaining.error ||
        remaining.data?.length !== 0 ||
        publicRemaining?.length !== 0
      )
        cleanup = false
    }
  }
  return { passed: !failure && cleanup, checks, stage, failure, cleanup }
}
