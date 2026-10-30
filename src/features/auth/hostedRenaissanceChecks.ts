import { publishStory, type JournalEntry } from '../journal/journalApi'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
export async function hostedRenaissanceChecks(
  A: SupabaseClient,
  B: SupabaseClient,
  a: string,
  b: string,
) {
  let checks = 0,
    stage = 'identity',
    failure = '',
    cleanup = true
  const ids = [crypto.randomUUID(), crypto.randomUUID()]
  const check = (ok: unknown) => {
    if (!ok) throw Error(`Check ${checks + 1} failed`)
    checks++
  }
  const anon = createClient(authConfig!.url, authConfig!.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const url = `${authConfig!.url}/functions/v1/media-gateway`
  const invoke = (
    client: SupabaseClient,
    body: Record<string, unknown> | Blob,
    headers?: Record<string, string>,
  ) => client.functions.invoke('media-gateway', { body, headers })
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
    stage = 'synthetic entries'
    for (const [client, id] of [
      [A, ids[0]],
      [B, ids[1]],
    ] as const)
      check(
        !(
          await client.from('journal_entries').insert({
            id,
            title: 'Synthetic Renaissance verification',
            body: 'Synthetic private source',
          })
        ).error,
      )
    check(
      (await B.from('journal_entries').select('id').eq('id', ids[0])).data
        ?.length === 0,
    )
    check(
      (await A.from('journal_entries').select('id').eq('id', ids[1])).data
        ?.length === 0,
    )
    stage = 'appearance privacy'
    const own = await A.from('user_settings')
      .select('appearance')
      .eq('user_id', a)
      .maybeSingle()
    check(!own.error)
    const other = await B.from('user_settings')
      .select('appearance')
      .eq('user_id', a)
    check(!other.error && other.data.length === 0)
    check((await anon.from('user_settings').select('appearance')).error)
    stage = 'trusted upload'
    const response = await fetch('/covers/pacific-dusk.jpg'),
      blob = await response.blob()
    check(response.ok)
    const upload = await invoke(A, blob, {
      'Content-Type': 'image/jpeg',
      'x-action': 'upload',
      'x-entry-id': ids[0],
    })
    check(!upload.error && typeof upload.data?.id === 'string')
    const media = upload.data.id as string
    const privatePath = `${a}/${media}.webp`
    check(
      (await B.storage.from('deardaily-private').download(privatePath)).error,
    )
    check(
      (await anon.storage.from('deardaily-private').download(privatePath))
        .error,
    )
    check(
      (
        await A.storage
          .from('deardaily-private')
          .upload(
            `${a}/${crypto.randomUUID()}.webp`,
            new Blob(['not a decoded image'], { type: 'image/webp' }),
          )
      ).error,
    )
    check(
      (
        await invoke(B, blob, {
          'Content-Type': 'image/jpeg',
          'x-action': 'upload',
          'x-entry-id': ids[0],
        })
      ).error,
    )
    check((await invoke(B, { action: 'read', id: media })).error)
    check((await invoke(anon, { action: 'read', id: media })).error)
    const read = await invoke(A, { action: 'read', id: media })
    check(!read.error && typeof read.data?.url === 'string')
    const photo = await fetch(read.data.url)
    check(photo.ok && photo.headers.get('content-type')?.includes('image/webp'))
    check(
      (await B.from('private_media').select('id').eq('id', media)).data
        ?.length === 0,
    )
    check((await anon.from('private_media').select('id')).error)
    check(
      (await A.from('private_media').select('object_key').eq('id', media))
        .error,
    )
    stage = 'private rich save and ownership'
    const document = {
      icon: '🐱',
      publication: {
        category: 'Travel',
        tags: 'synthetic-public',
        byline: false,
      },
      version: 1,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Synthetic approved public words' },
            ],
          },
          {
            type: 'journalImage',
            attrs: {
              assetId: media,
              alt: 'Approved synthetic photograph',
              width: 'wide',
              align: 'center',
            },
          },
        ],
      },
      page: { cover: 'upload', position: 63, assetId: media },
    }
    const saved = await A.from('journal_entries')
      .update({
        body: 'Synthetic approved public words',
        writing_document: document,
      })
      .eq('id', ids[0])
      .select('version,writing_document')
      .single()
    check(!saved.error && saved.data.writing_document.page.position === 63)
    if (!saved.data) throw Error('Save unavailable')
    check(
      (
        await B.from('journal_entries')
          .update({ writing_document: document })
          .eq('id', ids[1])
      ).error,
    )
    const stale = await A.from('journal_entries')
      .update({ body: 'Stale synthetic overwrite' })
      .eq('id', ids[0])
      .eq('version', saved.data.version - 1)
      .select('id')
    check(!stale.error && stale.data.length === 0)
    check(
      (
        await invoke(B, {
          action: 'prepare',
          entry: ids[0],
          version: saved.data.version,
        })
      ).error,
    )
    check(
      (
        await invoke(A, {
          action: 'prepare',
          entry: ids[0],
          version: saved.data.version - 1,
        })
      ).error,
    )
    stage = 'explicit public copy'
    const prepared = await invoke(A, {
      action: 'prepare',
      entry: ids[0],
      version: saved.data.version,
    })
    check(!prepared.error && prepared.data?.document)
    let publicId = prepared.data.document.page.publicId
    check(
      typeof publicId === 'string' &&
        publicId !== media &&
        !JSON.stringify(prepared.data.document).includes(media) &&
        !JSON.stringify(prepared.data.document).includes('assetId'),
    )
    check((await fetch(`${url}?public=${publicId}`)).status === 404)
    check(
      (
        await A.from('public_stories').insert({
          id: ids[0],
          user_id: a,
          title: 'Rejected private references',
          body: 'Synthetic words',
          writing_document: document,
        })
      ).error,
    )
    const privateRow = await A.from('journal_entries')
      .select('*')
      .eq('id', ids[0])
      .single()
    check(
      !privateRow.error &&
        privateRow.data.writing_document.publication.category === 'Travel',
    )
    const published = await publishStory(
      A,
      a,
      privateRow.data as JournalEntry,
      false,
      {
        public_category: 'Travel',
        public_tags: ['synthetic-public'],
        public_username: null,
      },
    )
    publicId = published.writing_document!.page!.publicId!
    check(!Object.hasOwn(published.writing_document!, 'publication'))
    check(published.writing_document?.icon === '🐱')

    check(
      (
        await anon.storage
          .from('deardaily-story-media')
          .download(`${publicId}.webp`)
      ).error,
    )
    const publicPhoto = await fetch(`${url}?public=${publicId}`)
    check(
      publicPhoto.ok &&
        publicPhoto.headers.get('content-type')?.includes('image/webp'),
    )
    const story = await anon
      .from('public_stories')
      .select('id,body,writing_document')
      .eq('id', ids[0])
      .single()
    check(
      !story.error && story.data.writing_document.page.publicId === publicId,
    )
    check(
      (await anon.from('public_stories').select('user_id').eq('id', ids[0]))
        .error,
    )
    check(
      (await anon.from('journal_entries').select('id').eq('id', ids[0])).error,
    )
    check(
      (
        await B.from('public_stories').insert({
          id: ids[1],
          user_id: b,
          title: 'Rejected media spoof',
          body: 'Synthetic',
          writing_document: prepared.data.document,
        })
      ).error,
    )
    stage = 'independent snapshot'
    check(
      !(
        await A.from('journal_entries')
          .update({
            body: 'NEW private synthetic words',
            writing_document: null,
          })
          .eq('id', ids[0])
      ).error,
    )
    check(
      (
        await anon
          .from('public_stories')
          .select('body')
          .eq('id', ids[0])
          .single()
      ).data?.body === 'Synthetic approved public words',
    )
    stage = 'unsafe input'
    check(
      (
        await invoke(
          A,
          new Blob(['<svg><script>bad()</script></svg>'], {
            type: 'image/png',
          }),
          {
            'Content-Type': 'image/png',
            'x-action': 'upload',
            'x-entry-id': ids[0],
          },
        )
      ).error,
    )
    stage = 'unpublish'
    check(!(await A.from('public_stories').delete().eq('id', ids[0])).error)
    check((await fetch(`${url}?public=${publicId}`)).status === 404)
    check(
      (await anon.from('public_stories').select('id').eq('id', ids[0])).data
        ?.length === 0,
    )
    check(!(await invoke(A, { action: 'read', id: media })).error)
    const cleaned = await invoke(A, { action: 'cleanup' })
    check(!cleaned.error && cleaned.data.cleaned >= 1)
  } catch (e) {
    failure = e instanceof Error ? e.message : 'Verification failed'
  } finally {
    for (const [client, id] of [
      [A, ids[0]],
      [B, ids[1]],
    ] as const) {
      if ((await client.from('public_stories').delete().eq('id', id)).error)
        cleanup = false
      if ((await client.from('journal_entries').delete().eq('id', id)).error)
        cleanup = false
      const remaining = await client
        .from('journal_entries')
        .select('id')
        .eq('id', id)
      if (remaining.error || remaining.data?.length !== 0) cleanup = false
      const cleaned = await invoke(client, { action: 'cleanup' })
      if (cleaned.error) cleanup = false
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
