import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import {
  draftOf,
  newDraft,
  publishStory,
  saveEntry,
  unpublishStory,
} from '../journal/journalApi'
import { persistentMusicEnabled, type PrivateMusic } from '../music/music'
/** Exact synthetic rows only; never signs out or serializes either session. */
export async function hostedMusicChecks(
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
    marker = 'Synthetic music gate ' + crypto.randomUUID()
  let checks = 0,
    stage = 'identity',
    failure = '',
    cleanup = true,
    verified = false
  const check = (condition: unknown) => {
    if (!condition) throw Error(`Check ${checks + 1} failed`)
    checks++
  }
  const selection: PrivateMusic = {
    provider: 'spotify',
    kind: 'track',
    id: '4uLU6hMCjMI75M1A2tKUQC',
    share: false,
  }
  try {
    check(persistentMusicEnabled)
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
    verified = true
    stage = 'private save and reload'
    let row = await saveEntry(
      a,
      aId,
      ids[0],
      {
        ...newDraft(),
        title: marker,
        body: 'Synthetic private soundtrack',
        music: selection,
      },
      null,
    )
    await saveEntry(
      b,
      bId,
      ids[1],
      {
        ...newDraft(),
        title: marker,
        body: 'Synthetic B draft',
        music: { ...selection, kind: 'playlist', share: true },
      },
      null,
    )
    const own = await a
      .from('journal_entries')
      .select('music')
      .eq('id', ids[0])
      .single()
    check(
      !own.error &&
        own.data.music.id === selection.id &&
        own.data.music.share === false,
    )
    let response = await b
      .from('journal_entries')
      .select('id,music')
      .eq('id', ids[0])
    check(!response.error && response.data.length === 0)
    response = await a
      .from('journal_entries')
      .select('id,music')
      .eq('id', ids[1])
    check(!response.error && response.data.length === 0)
    check(
      Boolean(
        (
          await anonymous
            .from('journal_entries')
            .select('music')
            .eq('id', ids[0])
        ).error,
      ),
    )
    stage = 'explicit public approval'
    const publicSelection = {
      provider: selection.provider,
      kind: selection.kind,
      id: selection.id,
    }
    check(
      Boolean(
        (
          await a
            .from('public_stories')
            .insert({
              id: ids[0],
              user_id: aId,
              title: marker,
              body: 'Synthetic public snapshot',
              music: publicSelection,
            })
        ).error,
      ),
    )
    await publishStory(a, aId, row, false)
    let publicRow = await anonymous
      .from('public_stories')
      .select('music')
      .eq('id', ids[0])
      .single()
    check(!publicRow.error && publicRow.data.music === null)
    row = await saveEntry(
      a,
      aId,
      ids[0],
      { ...draftOf(row), music: { ...selection, share: true } },
      row.version,
    )
    await publishStory(a, aId, row, true)
    publicRow = await anonymous
      .from('public_stories')
      .select('music')
      .eq('id', ids[0])
      .single()
    check(
      !publicRow.error &&
        publicRow.data.music.id === selection.id &&
        Object.keys(publicRow.data.music).sort().join(',') ===
          'id,kind,provider',
    )
    check(
      Boolean(
        (
          await anonymous
            .from('public_stories')
            .select('user_id')
            .eq('id', ids[0])
        ).error,
      ),
    )
    response = await anonymous
      .from('public_stories')
      .select('id,music')
      .eq('id', ids[1])
    check(!response.error && response.data.length === 0)
    stage = 'cross-user writes'
    response = await b
      .from('journal_entries')
      .update({ music: null })
      .eq('id', ids[0])
      .select('id')
    check(!response.error && response.data.length === 0)
    response = await b
      .from('public_stories')
      .update({ music: null })
      .eq('id', ids[0])
      .select('id')
    check(!response.error && response.data.length === 0)
    stage = 'snapshot independence and removal'
    row = await saveEntry(
      a,
      aId,
      ids[0],
      { ...draftOf(row), music: null },
      row.version,
    )
    publicRow = await anonymous
      .from('public_stories')
      .select('music')
      .eq('id', ids[0])
      .single()
    check(!publicRow.error && publicRow.data.music.id === selection.id)
    await publishStory(a, aId, row, true)
    publicRow = await anonymous
      .from('public_stories')
      .select('music')
      .eq('id', ids[0])
      .single()
    check(!publicRow.error && publicRow.data.music === null)
    await unpublishStory(a, ids[0])
    response = await anonymous
      .from('public_stories')
      .select('id,music')
      .eq('id', ids[0])
    check(!response.error && response.data.length === 0)
    stage = 'complete'
  } catch {
    failure = 'Music security verification failed; do not activate production.'
  } finally {
    if (verified)
      for (const [index, client, user] of [
        [0, a, aId],
        [1, b, bId],
      ] as const) {
        try {
          const removed = await client
            .from('journal_entries')
            .delete()
            .eq('id', ids[index])
            .eq('user_id', user)
            .eq('title', marker)
          const remaining = await client
            .from('journal_entries')
            .select('id')
            .eq('id', ids[index])
          if (removed.error || remaining.error || remaining.data.length)
            cleanup = false
        } catch {
          cleanup = false
        }
      }
  }
  return {
    passed: !failure && cleanup,
    checks,
    stage,
    failure,
    cleanup,
    fixtureEntryIds: ids,
    marker,
    distinctIdentities: verified,
  }
}
