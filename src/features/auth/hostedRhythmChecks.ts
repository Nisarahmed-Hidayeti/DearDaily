import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import { localDay } from '../journal/journalApi'
import { rhythmActivity } from '../community/publicRhythm'
/** Synthetic writer profile only; stops if that account already has a real profile. */
export async function hostedRhythmChecks(
  a: SupabaseClient,
  b: SupabaseClient,
  aId: string,
  bId: string,
  automatic = false,
) {
  const anon = createClient(authConfig!.url, authConfig!.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()],
    username = 'rhythm_' + crypto.randomUUID().replaceAll('-', '').slice(0, 15),
    marker = 'Synthetic calendar ' + crypto.randomUUID()
  let checks = 0,
    created = false,
    cleanup = true,
    error = ''
  const check = (v: unknown) => {
    if (!v) throw Error('Check ' + (checks + 1) + ' failed')
    checks++
  }
  try {
    const [av, bv] = await Promise.all([a.auth.getUser(), b.auth.getUser()])
    check(
      !av.error &&
        !bv.error &&
        av.data.user?.id === aId &&
        bv.data.user?.id === bId &&
        aId !== bId,
    )
    const before = await b.rpc('my_public_profile')
    check(!before.error && before.data === null)
    const source = await b.from('journal_entries').select('id').limit(1)
    check(!source.error && source.data.length === 0)
    const made = await b
      .from('public_profiles')
      .insert({ username, display_name: marker, visible: true })
    check(!made.error)
    created = true
    const empty = await anon
      .from('public_profiles')
      .select('public_rhythm')
      .eq('username', username)
      .single()
    check(!empty.error && empty.data.public_rhythm === null)
    for (const [i, client] of [a, b].entries()) {
      const saved = await client.from('journal_entries').insert({
        id: ids[i],
        title: marker,
        body: 'Synthetic private source',
        entry_date: localDay(new Date()),
        status: 'saved',
      })
      check(!saved.error)
    }
    const shared = automatic
      ? await b.rpc('set_public_writing_visibility', {
          show_streak: true,
          show_calendar: true,
          zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      : await b.rpc('set_public_rhythm', {
          enabled: true,
          today: localDay(new Date()),
        })
    const sharedCalendar = automatic ? shared.data?.public_rhythm : shared.data
    check(
      !shared.error &&
        !!rhythmActivity(sharedCalendar) &&
        sharedCalendar.days.includes(localDay(new Date())),
    )
    const view = await anon
      .from('public_profiles')
      .select('public_rhythm')
      .eq('username', username)
      .single()
    check(
      !view.error &&
        JSON.stringify(view.data.public_rhythm) ===
          JSON.stringify(sharedCalendar),
    )
    for (const [client, id] of [
      [a, ids[1]],
      [b, ids[0]],
    ] as const) {
      const other = await client
        .from('journal_entries')
        .select('id')
        .eq('id', id)
      check(!other.error && other.data.length === 0)
    }
    check(
      !!(
        await anon.from('journal_entries').select('entry_date').eq('id', ids[1])
      ).error,
    )
    check(
      !!(
        await a
          .from('public_profiles')
          .update({ public_rhythm: { start: '2026-01-01', days: [] } })
          .eq('username', username)
      ).error,
    )
    check(!!(await anon.rpc('set_public_rhythm', { enabled: true })).error)
    check(
      !!(
        await anon
          .from('public_profiles')
          .select('user_id')
          .eq('username', username)
      ).error,
    )
    if (automatic) {
      const initial = await anon.rpc('get_public_writing_activity', {
        profile_username: username,
      })
      check(!initial.error && initial.data.public_streak === 1)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const added = await b.from('journal_entries').insert({
        id: ids[2],
        title: marker,
        body: 'Synthetic automatic day',
        entry_date: localDay(yesterday),
        status: 'saved',
      })
      check(!added.error)
      const updated = await anon.rpc('get_public_writing_activity', {
        profile_username: username,
      })
      check(
        !updated.error &&
          updated.data.public_streak === 2 &&
          updated.data.public_rhythm.days.length === 2,
      )
      const countOnly = await b.rpc('set_public_writing_visibility', {
        show_streak: true,
        show_calendar: false,
        zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      check(!countOnly.error && countOnly.data.public_rhythm === null)
      const countView = await anon.rpc('get_public_writing_activity', {
        profile_username: username,
      })
      check(
        !countView.error &&
          countView.data.public_streak === 2 &&
          countView.data.public_rhythm === null,
      )
      check(
        !!(
          await anon.rpc('set_public_writing_visibility', {
            show_streak: true,
            show_calendar: true,
            zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        ).error,
      )
    }
    const hidden = await b
      .from('public_profiles')
      .update({ visible: false })
      .eq('username', username)
    check(!hidden.error)
    const unavailable = await anon
      .from('public_profiles')
      .select('public_rhythm')
      .eq('username', username)
    check(!unavailable.error && unavailable.data.length === 0)
    if (automatic) {
      const invisible = await anon.rpc('get_public_writing_activity', {
        profile_username: username,
      })
      check(!invisible.error && invisible.data === null)
    }
    const hide = await b.rpc('set_public_rhythm', {
      enabled: false,
      today: localDay(new Date()),
    })
    check(!hide.error && hide.data === null)
    const own = await b
      .from('public_profiles')
      .select('public_rhythm')
      .eq('username', username)
      .single()
    check(!own.error && own.data.public_rhythm === null)
  } catch (e) {
    error = e instanceof Error ? e.message : 'Verification failed'
  } finally {
    for (const [i, client] of [a, b, b].entries()) {
      const result = await client
        .from('journal_entries')
        .delete()
        .eq('id', ids[i])
        .eq('title', marker)
      const remaining = await client
        .from('journal_entries')
        .select('id')
        .eq('id', ids[i])
      if (result.error || remaining.error || remaining.data.length)
        cleanup = false
    }
    if (created) {
      const result = await b
        .from('public_profiles')
        .delete()
        .eq('username', username)
        .eq('display_name', marker)
      const remaining = await b.rpc('my_public_profile')
      if (result.error || remaining.error || remaining.data !== null)
        cleanup = false
    }
  }
  return { passed: !error && cleanup, checks, cleanup, error, ids, username }
}
