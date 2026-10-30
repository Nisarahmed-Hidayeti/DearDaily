import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
export async function hostedRichWritingChecks(
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
    if (!ok) throw Error(`${stage}: check ${checks + 1} failed`)
    checks++
  }
  const ids = [crypto.randomUUID(), crypto.randomUUID()]
  const anon = createClient(authConfig!.url, authConfig!.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const doc = (text: string) => ({
    version: 1,
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    },
  })
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
    stage = 'legacy conversion'
    for (const [client, id] of [
      [A, ids[0]],
      [B, ids[1]],
    ] as const) {
      check(
        !(
          await client
            .from('journal_entries')
            .insert({
              id,
              title: 'Synthetic rich writing',
              body: 'Original private fixture',
            })
        ).error,
      )
      const save = await client
        .from('journal_entries')
        .update({
          writing_document: doc('Revised private fixture'),
          body: 'Revised private fixture',
          page_icon: '🌿',
          cover_preset: 'dawn',
        })
        .eq('id', id)
        .eq('version', 1)
        .select('id,version,original_body,writing_document')
        .single()
      check(
        !save.error &&
          save.data?.version === 2 &&
          save.data?.original_body === 'Original private fixture',
      )
      check(
        save.data?.writing_document?.content?.content?.[0]?.content?.[0]
          ?.text === 'Revised private fixture',
      )
      check(
        Boolean(
          (
            await client
              .from('journal_entries')
              .update({ original_body: 'attack' })
              .eq('id', id)
          ).error,
        ),
      )
      check(
        Boolean(
          (
            await client
              .from('journal_entries')
              .update({ body: 'stale plain client' })
              .eq('id', id)
          ).error,
        ),
      )
      const stale = await client
        .from('journal_entries')
        .update({ writing_document: doc('stale'), body: 'stale' })
        .eq('id', id)
        .eq('version', 1)
        .select('id')
      check(!stale.error && stale.data?.length === 0)
    }
    stage = 'cross user rich isolation'
    for (const [client, other] of [
      [A, ids[1]],
      [B, ids[0]],
    ] as const) {
      const read = await client
        .from('journal_entries')
        .select('id,writing_document,original_body')
        .eq('id', other)
      check(!read.error && read.data?.length === 0)
      const edit = await client
        .from('journal_entries')
        .update({ body: 'attack', writing_document: doc('attack') })
        .eq('id', other)
        .select('id')
      check(!edit.error && edit.data?.length === 0)
      const del = await client
        .from('journal_entries')
        .delete()
        .eq('id', other)
        .select('id')
      check(!del.error && del.data?.length === 0)
    }
    check(
      Boolean(
        (
          await anon
            .from('journal_entries')
            .select('writing_document,original_body')
            .in('id', ids)
        ).error,
      ),
    )
    stage = 'public snapshot'
    const fields = 'id,title,body,writing_document,page_icon,cover_preset'
    check(
      !(
        await A.from('public_stories').insert({
          id: ids[0],
          user_id: a,
          title: 'Synthetic public rich story',
          body: 'Chosen public fixture',
          writing_document: doc('Chosen public fixture'),
          page_icon: '🌙',
          cover_preset: 'ocean',
        })
      ).error,
    )
    const pub = await anon
      .from('public_stories')
      .select(fields)
      .eq('id', ids[0])
      .single()
    check(
      !pub.error &&
        pub.data?.body === 'Chosen public fixture' &&
        pub.data?.page_icon === '🌙',
    )
    check(
      pub.data?.writing_document?.content?.content?.[0]?.content?.[0]?.text ===
        'Chosen public fixture',
    )
    check(
      Boolean(
        (
          await anon
            .from('public_stories')
            .select('original_body')
            .eq('id', ids[0])
        ).error,
      ),
    )
    check(
      Boolean(
        (await anon.from('public_stories').select('user_id').eq('id', ids[0]))
          .error,
      ),
    )
    const attack = await B.from('public_stories')
      .update({ body: 'attack', writing_document: doc('attack') })
      .eq('id', ids[0])
      .select('id')
    check(!attack.error && attack.data?.length === 0)
    check(
      !(
        await A.from('journal_entries')
          .update({
            writing_document: doc('NEW PRIVATE fixture'),
            body: 'NEW PRIVATE fixture',
          })
          .eq('id', ids[0])
          .eq('version', 2)
      ).error,
    )
    check(
      (
        await anon
          .from('public_stories')
          .select('body')
          .eq('id', ids[0])
          .single()
      ).data?.body === 'Chosen public fixture',
    )
    check(
      !(
        await A.from('public_stories')
          .update({ body: 'Explicit plain public update' })
          .eq('id', ids[0])
      ).error,
    )
    check(
      (
        await anon
          .from('public_stories')
          .select('writing_document')
          .eq('id', ids[0])
          .single()
      ).data?.writing_document === null,
    )
    check(!(await A.from('public_stories').delete().eq('id', ids[0])).error)
    check(
      (await anon.from('public_stories').select('id').eq('id', ids[0])).data
        ?.length === 0,
    )
    check(
      (await A.from('journal_entries').select('body').eq('id', ids[0]).single())
        .data?.body === 'NEW PRIVATE fixture',
    )
  } catch (e) {
    failure = e instanceof Error ? e.message : 'Verification failed'
  } finally {
    for (const [client, id] of [
      [A, ids[0]],
      [B, ids[1]],
    ] as const) {
      if ((await client.from('journal_entries').delete().eq('id', id)).error)
        cleanup = false
      const remaining = await client
        .from('journal_entries')
        .select('id')
        .eq('id', id)
      if (remaining.error || remaining.data?.length !== 0) cleanup = false
    }
  }
  return {
    passed: !failure && cleanup,
    checks,
    stage,
    failure,
    cleanup,
    fixtureStoryIds: ids,
  }
}
