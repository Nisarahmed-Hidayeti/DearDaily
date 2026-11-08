import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import {
  localDay,
  publishStory,
  type JournalEntry,
} from '../journal/journalApi'
export async function hostedOwnerChecks(
  owner: SupabaseClient,
  low: SupabaseClient,
  writer: SupabaseClient,
  ownerId: string,
  writerId: string,
) {
  const anonymous = createClient(authConfig!.url, authConfig!.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
  const marker = 'Synthetic owner gate ' + crypto.randomUUID()
  const username =
    'test_' + crypto.randomUUID().replaceAll('-', '').slice(0, 16)
  let checks = 0,
    stage = 'identity',
    failure = '',
    cleanup = true,
    safeToClean = false,
    createdProfile = false
  const notices: string[] = []
  const check = (ok: unknown) => {
    if (!ok) throw Error(`Check ${checks + 1} failed`)
    checks++
  }
  const media = (
    client: SupabaseClient,
    body: Record<string, unknown> | Blob,
    headers?: Record<string, string>,
  ) => client.functions.invoke('media-gateway', { body, headers })
  try {
    const [o, l, b] = await Promise.all([
      owner.auth.getUser(),
      low.auth.getUser(),
      writer.auth.getUser(),
    ])
    check(
      !o.error &&
        !l.error &&
        !b.error &&
        o.data.user?.id === ownerId &&
        l.data.user?.id === ownerId &&
        b.data.user?.id === writerId &&
        ownerId !== writerId,
    )
    const access = await owner.rpc('my_owner_access'),
      lowAccess = await low.rpc('my_owner_access')
    check(
      !access.error && access.data.owner === true && access.data.mfa === true,
    )
    check(
      !lowAccess.error &&
        lowAccess.data.owner === true &&
        lowAccess.data.mfa === false,
    )
    check((await low.rpc('owner_public_stories')).error?.code === '42501')
    check((await low.rpc('owner_publishing_bans')).error?.code === '42501')
    check(
      (
        await low.rpc('owner_moderate_story', {
          story: ids[0],
          ban_author: true,
          reason: marker,
        })
      ).error?.code === '42501',
    )
    check((await writer.rpc('owner_public_stories')).error?.code === '42501')
    check(
      (
        await writer.rpc('owner_moderate_story', {
          story: ids[0],
          ban_author: true,
          reason: marker,
        })
      ).error?.code === '42501',
    )
    check((await anonymous.rpc('owner_public_stories')).error?.code === '42501')
    check(
      (await anonymous.rpc('my_moderation_notices')).error?.code === '42501',
    )
    stage = 'empty designated writer preflight'
    const entryCount = await writer
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
    const mediaCount = await writer
      .from('private_media')
      .select('id', { count: 'exact', head: true })
    const profile = await writer.rpc('my_public_profile'),
      priorBans = await owner.rpc('owner_publishing_bans')
    if (
      entryCount.error ||
      entryCount.count !== 0 ||
      mediaCount.error ||
      mediaCount.count !== 0 ||
      profile.error ||
      profile.data ||
      priorBans.error ||
      priorBans.data.some(
        (r: { author_ref: string }) => r.author_ref === writerId,
      )
    )
      throw Error(
        'Designated writer is not empty and unrestricted. No real data may be used as fixtures.',
      )
    safeToClean = true
    stage = 'private synthetic sources'
    for (let i = 0; i < ids.length; i++) {
      const day = new Date()
      day.setDate(day.getDate() - i)
      check(
        !(
          await writer.from('journal_entries').insert({
            id: ids[i],
            title: 'Synthetic owner gate',
            body: 'Synthetic private words',
            entry_date: localDay(day),
            status: i < 2 ? 'saved' : 'draft',
          })
        ).error,
      )
    }
    check(
      (await owner.from('journal_entries').select('id').in('id', ids)).data
        ?.length === 0,
    )
    check(
      (await anonymous.from('journal_entries').select('id').in('id', ids))
        .error,
    )
    check(
      !(
        await writer.from('public_stories').insert({
          id: ids[0],
          user_id: writerId,
          title: 'Synthetic anonymous moderation',
          body: 'Deliberately public synthetic words',
        })
      ).error,
    )
    const list = await owner.rpc('owner_public_stories')
    check(!list.error && list.data.some((r: { id: string }) => r.id === ids[0]))
    check(
      Object.keys(list.data.find((r: { id: string }) => r.id === ids[0]))
        .sort()
        .join(',') === 'id,public_username,published_at,title',
    )
    stage = 'remove unreported anonymous story'
    check(
      !(
        await owner.rpc('owner_moderate_story', {
          story: ids[0],
          ban_author: false,
          reason: marker + ' remove',
        })
      ).error,
    )
    check(
      (await anonymous.from('public_stories').select('id').eq('id', ids[0]))
        .data?.length === 0,
    )
    check(
      (
        await writer.from('public_stories').insert({
          id: ids[0],
          user_id: writerId,
          title: 'Rejected republication',
          body: 'Synthetic',
        })
      ).error?.code === '42501',
    )
    stage = 'approved synthetic public photo'
    const image = await fetch('/covers/pacific-dusk.jpg')
    check(image.ok)
    const upload = await media(writer, await image.blob(), {
      'Content-Type': 'image/jpeg',
      'x-action': 'upload',
      'x-entry-id': ids[1],
    })
    check(!upload.error && typeof upload.data?.id === 'string')
    const assetId = upload.data.id as string
    const text = 'Deliberately shared synthetic photo words'
    const document = {
      version: 1,
      page: { cover: 'upload', position: 50, assetId },
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      },
    }
    const saved = await writer
      .from('journal_entries')
      .update({ body: text, writing_document: document })
      .eq('id', ids[1])
      .select('*')
      .single()
    check(!saved.error)
    const published = await publishStory(
      writer,
      writerId,
      saved.data as JournalEntry,
      false,
    )
    const publicId = published.writing_document?.page?.publicId
    check(typeof publicId === 'string' && publicId !== assetId)
    const publicUrl = `${authConfig!.url}/functions/v1/media-gateway?public=${publicId}`
    check((await fetch(publicUrl)).ok)
    check((await media(owner, { action: 'read', id: assetId })).error)
    stage = 'publishing restriction and public-photo revocation'
    check(
      !(
        await owner.rpc('owner_moderate_story', {
          story: ids[1],
          ban_author: true,
          reason: marker + ' ban',
        })
      ).error,
    )
    check((await fetch(publicUrl)).status === 404)
    check(!(await media(writer, { action: 'read', id: assetId })).error)
    check(
      (await anonymous.from('public_stories').select('id').in('id', ids)).data
        ?.length === 0,
    )
    check(
      (
        await writer.from('public_stories').insert({
          id: ids[2],
          user_id: writerId,
          title: 'Rejected banned publication',
          body: 'Synthetic',
        })
      ).error?.code === '42501',
    )
    check(
      !(
        await writer
          .from('journal_entries')
          .update({ body: 'Private writing remains available' })
          .eq('id', ids[2])
          .select('id')
          .single()
      ).error,
    )
    check(
      (await writer.from('journal_entries').select('id').in('id', ids)).data
        ?.length === 3,
    )
    stage = 'private notices and restoring future publishing'
    const received = await writer.rpc('my_moderation_notices')
    check(
      !received.error &&
        received.data.some(
          (n: { reason: string }) => n.reason === marker + ' ban',
        ),
    )
    check(
      received.data
        .filter((n: { reason: string }) => n.reason.startsWith(marker))
        .every(
          (n: object) =>
            !Object.hasOwn(n, 'user_id') && !Object.hasOwn(n, 'actor_id'),
        ),
    )
    const ownerNotices = await owner.rpc('my_moderation_notices')
    check(
      !ownerNotices.error &&
        !ownerNotices.data.some((n: { reason: string }) =>
          n.reason.startsWith(marker),
        ),
    )
    check(
      !(
        await owner.rpc('owner_restore_publishing', {
          author_ref: writerId,
          reason: marker + ' restore',
        })
      ).error,
    )
    check(
      !(
        await writer.from('public_stories').insert({
          id: ids[2],
          user_id: writerId,
          title: 'Synthetic restored publication',
          body: 'Synthetic public words',
        })
      ).error,
    )
    check(
      (
        await writer.from('public_stories').insert({
          id: ids[0],
          user_id: writerId,
          title: 'Removed entry still blocked',
          body: 'Synthetic',
        })
      ).error?.code === '42501',
    )
    stage = 'optional count-only streak snapshot'
    check(
      !(
        await writer.from('public_profiles').insert({
          username,
          display_name: 'Synthetic streak writer',
          visible: false,
        })
      ).error,
    )
    createdProfile = true
    check(
      (
        await writer
          .from('public_profiles')
          .select('public_streak')
          .eq('username', username)
          .single()
      ).data?.public_streak === null,
    )
    const shared = await writer.rpc('set_public_streak', {
      enabled: true,
      today: localDay(new Date()),
    })
    check(!shared.error && shared.data === 2)
    check(
      (
        await anonymous
          .from('public_profiles')
          .select('public_streak')
          .eq('username', username)
      ).data?.length === 0,
    )
    check(
      !(
        await writer
          .from('public_profiles')
          .update({ visible: true })
          .eq('username', username)
      ).error,
    )
    check(
      (
        await anonymous
          .from('public_profiles')
          .select('public_streak')
          .eq('username', username)
          .single()
      ).data?.public_streak === 2,
    )
    check(
      !(
        await writer
          .from('journal_entries')
          .update({ status: 'saved' })
          .eq('id', ids[2])
      ).error,
    )
    check(
      (
        await anonymous
          .from('public_profiles')
          .select('public_streak')
          .eq('username', username)
          .single()
      ).data?.public_streak === 2,
    )
    check(
      (
        await writer.rpc('set_public_streak', {
          enabled: true,
          today: localDay(new Date()),
        })
      ).data === 3,
    )
    const hidden = await writer.rpc('set_public_streak', {
      enabled: false,
      today: localDay(new Date()),
    })
    check(!hidden.error && hidden.data === null)
    check(
      (
        await anonymous
          .from('public_profiles')
          .select('public_streak')
          .eq('username', username)
          .single()
      ).data?.public_streak === null,
    )
    check(
      (
        await writer
          .from('public_profiles')
          .update({ public_streak: 99 })
          .eq('username', username)
      ).error?.code === '42501',
    )
    check(
      (
        await anonymous
          .from('public_profiles')
          .select('user_id')
          .eq('username', username)
      ).error,
    )
  } catch (e) {
    failure = e instanceof Error ? e.message : 'Verification interrupted'
  } finally {
    if (safeToClean) {
      try {
        const bans = await owner.rpc('owner_publishing_bans')
        const ownBan = bans.data?.find(
          (r: { author_ref: string; reason: string }) =>
            r.author_ref === writerId,
        )
        if (bans.error || (ownBan && !ownBan.reason.startsWith(marker)))
          cleanup = false
        if (
          ownBan?.reason.startsWith(marker) &&
          (
            await owner.rpc('owner_restore_publishing', {
              author_ref: writerId,
              reason: marker + ' cleanup',
            })
          ).error
        )
          cleanup = false
        if ((await writer.from('public_stories').delete().in('id', ids)).error)
          cleanup = false
        if ((await writer.from('journal_entries').delete().in('id', ids)).error)
          cleanup = false
        if (
          (await writer.from('journal_entries').select('id').in('id', ids)).data
            ?.length !== 0
        )
          cleanup = false
        if ((await media(writer, { action: 'cleanup' })).error) cleanup = false
        if (
          createdProfile &&
          (
            await writer
              .from('public_profiles')
              .delete()
              .eq('username', username)
          ).error
        )
          cleanup = false
        const allNotices = await writer.rpc('my_moderation_notices')
        if (allNotices.error) cleanup = false
        else
          for (const n of allNotices.data)
            if (n.reason.startsWith(marker)) notices.push(n.id)
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
    marker,
    fixtureEntryIds: ids,
    fixtureNoticeIds: notices,
    protectedAuditCleanupPending: notices.length > 0,
  }
}
