import type { CommunityStory } from '../community/communityApi'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import { profileFields, storyFields } from '../community/communityApi'
/** DEV only. Ordinary user SDKs; no service role. Refuses existing profiles. */
export async function hostedCommunityChecks(
  A: SupabaseClient,
  B: SupabaseClient,
  a: string,
  b: string,
) {
  let checks = 0,
    stage = 'identity',
    failure = '',
    cleanup = true
  const check = (ok: boolean) => {
    if (!ok) throw new Error(`${stage}: check ${checks + 1} failed`)
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
    bid = crypto.randomUUID(),
    suffix = aid.replaceAll('-', '').slice(0, 12)
  const aname = 'test_a_' + suffix,
    bname = 'test_b_' + suffix
  let profileA = false,
    profileB = false
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
    const ap = await A.rpc('my_public_profile'),
      bp = await B.rpc('my_public_profile')
    check(!ap.error && !bp.error && !ap.data && !bp.data)
    stage = 'hidden profiles'
    const pa = await A.from('public_profiles').insert({
      username: aname,
      display_name: 'Synthetic writer A',
      bio: 'Synthetic public biography',
    })
    profileA = !pa.error
    const paRead = await A.rpc('my_public_profile')
    stage = 'hidden profile A insert ' + (pa.error?.code ?? 'OK')
    check(!pa.error && !paRead.error && paRead.data?.visible === false)
    const pb = await B.from('public_profiles').insert({
      username: bname,
      display_name: 'Synthetic writer B',
    })
    profileB = !pb.error
    const pbRead = await B.rpc('my_public_profile')
    stage = 'hidden profile B insert ' + (pb.error?.code ?? 'OK')
    check(!pb.error && !pbRead.error && pbRead.data?.visible === false)
    const hidden = await anon
      .from('public_profiles')
      .select(profileFields)
      .in('username', [aname, bname])
    check(!hidden.error && hidden.data?.length === 0)
    check(
      Boolean(
        (await anon.from('public_profiles').select('*').eq('username', aname))
          .error,
      ),
    )
    check(
      Boolean(
        (
          await B.from('public_profiles')
            .select('user_id')
            .eq('username', aname)
        ).error,
      ),
    )
    const sourceA = await A.from('journal_entries')
      .insert({
        id: aid,
        title: 'Synthetic private A',
        body: 'PRIVATE fixture A',
        tags: ['private-tag'],
      })
      .select('id')
      .single()
    check(!sourceA.error)
    const sourceB = await B.from('journal_entries')
      .insert({
        id: bid,
        title: 'Synthetic private B',
        body: 'PRIVATE fixture B',
      })
      .select('id')
      .single()
    check(!sourceB.error)
    stage = 'account isolation'
    for (const [client, other] of [
      [A, bid],
      [B, aid],
    ] as const) {
      const read = await client
        .from('journal_entries')
        .select('id,body')
        .eq('id', other)
      check(!read.error && read.data?.length === 0)
      const update = await client
        .from('journal_entries')
        .update({ body: 'ATTACK' })
        .eq('id', other)
        .select('id')
      check(!update.error && update.data?.length === 0)
      const remove = await client
        .from('journal_entries')
        .delete()
        .eq('id', other)
        .select('id')
      check(!remove.error && remove.data?.length === 0)
    }
    check(
      Boolean(
        (await anon.from('journal_entries').select('id').eq('id', aid)).error,
      ),
    )
    for (const [client, name] of [
      [A, aname],
      [B, bname],
    ] as const) {
      const r = await client
        .from('public_profiles')
        .update({ visible: true })
        .eq('username', name)
      const own = await client.rpc('my_public_profile')
      check(!r.error && !own.error && own.data?.visible === true)
    }
    const publicProfiles = await anon
      .from('public_profiles')
      .select(profileFields)
      .in('username', [aname, bname])
    check(!publicProfiles.error && publicProfiles.data?.length === 2)
    const badEdit = await B.from('public_profiles')
      .update({ bio: 'ATTACK' })
      .eq('username', aname)
    check(!badEdit.error)
    const preserved = await A.rpc('my_public_profile')
    check(preserved.data?.bio === 'Synthetic public biography')
    stage = 'publication boundary'
    const draft = await anon
      .from('public_stories')
      .select<string, CommunityStory>(storyFields)
      .in('id', [aid, bid])
    check(!draft.error && draft.data?.length === 0)
    const pub = await A.from('public_stories')
      .insert({
        id: aid,
        user_id: a,
        title: 'Synthetic chosen public title',
        body: 'Synthetic chosen public body',
        public_username: aname,
        public_category: 'Growth',
        public_tags: ['public-only'],
      })
      .select<string, CommunityStory>(storyFields)
      .single()
    check(!pub.error)
    const impersonate = await A.from('public_stories')
      .update({ public_username: bname })
      .eq('id', aid)
    check(Boolean(impersonate.error))
    const foreignPub = await B.from('public_stories').insert({
      id: aid,
      user_id: b,
      title: 'Attack',
      body: 'Attack',
    })
    check(Boolean(foreignPub.error))
    const foreignEdit = await B.from('public_stories')
      .update({ body: 'ATTACK' })
      .eq('id', aid)
      .select('id')
    check(!foreignEdit.error && foreignEdit.data?.length === 0)
    const foreignDelete = await B.from('public_stories')
      .delete()
      .eq('id', aid)
      .select('id')
    check(!foreignDelete.error && foreignDelete.data?.length === 0)
    const safe = await anon
      .from('public_stories')
      .select<string, CommunityStory>(storyFields)
      .eq('id', aid)
      .single()
    check(
      !safe.error &&
        safe.data?.body === 'Synthetic chosen public body' &&
        safe.data?.public_username === aname,
    )
    check(
      Boolean(
        (await anon.from('public_stories').select('user_id').eq('id', aid))
          .error,
      ),
    )
    check(
      Boolean(
        (
          await anon
            .from('public_stories')
            .select('*,journal_entries(body)')
            .eq('id', aid)
        ).error,
      ),
    )
    await A.from('journal_entries')
      .update({ body: 'NEW PRIVATE fixture A' })
      .eq('id', aid)
    check(
      (await anon.from('public_stories').select('body').eq('id', aid).single())
        .data?.body === 'Synthetic chosen public body',
    )
    stage = 'identity opt out'
    check(
      !(
        await A.from('public_profiles')
          .update({ visible: false })
          .eq('username', aname)
      ).error,
    )
    check(
      (
        await anon
          .from('public_stories')
          .select('public_username')
          .eq('id', aid)
          .single()
      ).data?.public_username === null,
    )
    check(
      (
        await anon
          .from('public_profiles')
          .select('username')
          .eq('username', aname)
      ).data?.length === 0,
    )
    stage = 'reports and moderator authorization'
    check(
      Boolean(
        (
          await anon.rpc('submit_story_report', {
            story: aid,
            reason: 'spam',
            explanation: 'Synthetic',
          })
        ).error,
      ),
    )
    check(
      !(
        await B.rpc('submit_story_report', {
          story: aid,
          reason: 'spam',
          explanation: 'Synthetic Phase 4 test report',
        })
      ).error,
    )
    check(
      (
        await B.rpc('submit_story_report', {
          story: aid,
          reason: 'spam',
          explanation: 'Duplicate synthetic',
        })
      ).error?.code === '23505',
    )
    check(Boolean((await B.from('reports').select('*')).error))
    check((await B.rpc('moderation_queue')).error?.code === '42501')
    check(
      (
        await B.rpc('moderate_report', {
          report: crypto.randomUUID(),
          decision: 'remove',
          note: 'Unauthorized synthetic',
        })
      ).error?.code === '42501',
    )
    stage = 'authorized moderation'
    const queue = await A.rpc('moderation_queue')
    check(!queue.error && Array.isArray(queue.data))
    const report = (
      queue.data as { id: string; story_id: string; reporter_id?: string }[]
    ).find((r) => r.story_id === aid)
    check(Boolean(report) && !('reporter_id' in report!))
    check(
      !(
        await A.rpc('moderate_report', {
          report: report!.id,
          decision: 'remove',
          note: 'Synthetic Phase 4 fixture removal',
        })
      ).error,
    )
    check(
      (await anon.from('public_stories').select('id').eq('id', aid)).data
        ?.length === 0,
    )
    check(
      (await A.from('journal_entries').select('body').eq('id', aid).single())
        .data?.body === 'NEW PRIVATE fixture A',
    )
    check(
      (
        await A.from('public_stories').insert({
          id: aid,
          user_id: a,
          title: 'Synthetic retry',
          body: 'Synthetic retry',
        })
      ).error?.code === '42501',
    )
    stage = 'owner unpublish'
    check(
      !(
        await B.from('public_stories').insert({
          id: bid,
          user_id: b,
          title: 'Synthetic B public',
          body: 'Synthetic B public body',
        })
      ).error,
    )
    check(
      !(
        await B.from('public_stories')
          .delete()
          .eq('id', bid)
          .select('id')
          .single()
      ).error,
    )
    check(
      (await anon.from('public_stories').select('id').eq('id', bid)).data
        ?.length === 0,
    )
    check(
      (await B.from('journal_entries').select('body').eq('id', bid).single())
        .data?.body === 'PRIVATE fixture B',
    )
  } catch (e) {
    failure = e instanceof Error ? e.message : 'Unknown verification failure'
  } finally {
    for (const [client, id] of [
      [A, aid],
      [B, bid],
    ] as const) {
      const r = await client.from('journal_entries').delete().eq('id', id)
      if (r.error) cleanup = false
    }
    for (const [client, name, created] of [
      [A, aname, profileA],
      [B, bname, profileB],
    ] as const)
      if (created) {
        const r = await client
          .from('public_profiles')
          .delete()
          .eq('username', name)
        if (r.error) cleanup = false
      }
  }
  return {
    passed: !failure && cleanup,
    checks,
    stage,
    failure,
    cleanup,
    fixtureStoryIds: [aid, bid],
  }
}
