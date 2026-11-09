import {
  uploadPhoto,
  privatePhotoUrl,
  cleanQueuedPhotos,
} from '../media/mediaApi'
import { documentFromText } from '../rich-editor/document'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import {
  newDraft,
  saveEntry,
  draftOf,
  publishStory,
  unpublishStory,
} from '../journal/journalApi'
import {
  myProfile,
  saveProfile,
  removePublicProfile,
} from '../community/communityApi'
import { studioPolishEnabled } from '../rich-editor/studioPolish'
/** Real SDK sessions; synthetic identifiers only. No privileged key or account-setting writes. */
export async function hostedStudioChecks(
  a: SupabaseClient,
  b: SupabaseClient,
  aId: string,
  bId: string,
) {
  if (!studioPolishEnabled) return { checks: 0, skipped: true }
  const anonymous = createClient(authConfig!.url, authConfig!.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const id = crypto.randomUUID(),
    username = 's' + crypto.randomUUID().replaceAll('-', '').slice(0, 20)
  let checks = 0,
    madeProfile = false
  const check = (ok: unknown, label: string) => {
    if (!ok) throw Error('Studio: ' + label)
    checks++
  }
  let result:
    { checks: number; skipped: boolean; profileTested: boolean } | undefined
  let failure: unknown
  try {
    check(aId !== bId, 'different users')
    const prior = await myProfile(b)
    let row = await saveEntry(
      a,
      aId,
      id,
      {
        ...newDraft(),
        title: 'Synthetic studio gate',
        body: 'Synthetic private words',
        status: 'saved',
        music: {
          provider: 'spotify',
          kind: 'track',
          id: '4uLU6hMCjMI75M1A2tKUQC',
          share: false,
          excerpt: { start: 10, end: 19 },
        },
      },
      null,
    )
    check(row.music?.excerpt?.end === 19, 'private intended moment persisted')
    const hidden = await b
      .from('journal_entries')
      .select('id,music')
      .eq('id', id)
    check(
      !hidden.error && hidden.data.length === 0,
      'cross-user music isolation',
    )
    const anon = await anonymous
      .from('journal_entries')
      .select('id,music')
      .eq('id', id)
    check(
      !!anon.error || anon.data?.length === 0,
      'anonymous private access blocked',
    )
    const fixturePhoto = await fetch('/covers/met-oxbow-thumb.jpg')
    if (!fixturePhoto.ok) throw Error('Synthetic fixture image unavailable')
    const photo = await uploadPhoto(
      a,
      id,
      new File([await fixturePhoto.blob()], 'synthetic-cover.jpg', {
        type: 'image/jpeg',
      }),
      0,
    )
    check(
      (await privatePhotoUrl(a, photo)).startsWith('https://'),
      'owner reads private photo',
    )
    let otherPhotoBlocked = false,
      anonymousPhotoBlocked = false
    try {
      await privatePhotoUrl(b, photo)
    } catch {
      otherPhotoBlocked = true
    }
    try {
      await privatePhotoUrl(anonymous, photo)
    } catch {
      anonymousPhotoBlocked = true
    }
    check(otherPhotoBlocked, 'cross-user private image access blocked')
    check(anonymousPhotoBlocked, 'anonymous private image access blocked')
    const document = documentFromText(row.body)
    document.page = { cover: 'upload', assetId: photo, position: 35 }
    document.icon = '🌙'
    document.content.content!.push({
      type: 'journalImage',
      attrs: {
        assetId: photo,
        publicId: null,
        alt: 'Synthetic public-domain photo',
        width: 'wide',
        align: 'center',
      },
    })
    row = await saveEntry(
      a,
      aId,
      id,
      { ...draftOf(row), writing_document: document },
      row.version,
    )
    check(
      row.writing_document?.page?.assetId === photo,
      'private cover and inline image persist',
    )
    const noConsent = await a.from('public_stories').insert({
      id,
      user_id: aId,
      title: row.title,
      body: row.body,
      music: {
        provider: 'spotify',
        kind: 'track',
        id: row.music!.id,
        excerpt: { start: 10, end: 19 },
      },
    })
    check(!!noConsent.error, 'raw API requires sharing approval')
    row = await saveEntry(
      a,
      aId,
      id,
      { ...draftOf(row), music: { ...row.music!, share: true } },
      row.version,
    )
    await publishStory(a, aId, row, false, {
      public_username: null,
      public_category: 'Study',
      public_tags: [],
    })
    const pub = await anonymous
      .from('public_stories')
      .select('id,music,public_category,public_username,writing_document')
      .eq('id', id)
      .single()
    check(
      !pub.error &&
        pub.data.music.excerpt.start === 10 &&
        pub.data.music.excerpt.end === 19 &&
        !('share' in pub.data.music),
      'anonymous sees approved range only',
    )
    check(
      pub.data?.public_category === 'Study' &&
        pub.data?.public_username === null,
      'explicit public category and anonymity',
    )
    const publicPhoto = pub.data?.writing_document?.page?.publicId
    check(
      typeof publicPhoto === 'string' &&
        publicPhoto !== photo &&
        !JSON.stringify(pub.data?.writing_document).includes(photo),
      'public snapshot excludes private photo identifiers',
    )
    const publicPhotoUrl = `${authConfig!.url}/functions/v1/media-gateway?public=${publicPhoto}`
    check(
      (await fetch(publicPhotoUrl, { cache: 'no-store' })).ok,
      'anonymous can read deliberately published photo',
    )
    const spoof = await a
      .from('public_stories')
      .update({
        music: {
          provider: 'spotify',
          kind: 'track',
          id: row.music!.id,
          excerpt: { start: 10, end: 30 },
        },
      })
      .eq('id', id)
    check(!!spoof.error, 'different unapproved range rejected')
    row = await saveEntry(
      a,
      aId,
      id,
      {
        ...draftOf(row),
        music: { ...row.music!, excerpt: { start: 20, end: 29 } },
      },
      row.version,
    )
    const unchanged = await anonymous
      .from('public_stories')
      .select('music')
      .eq('id', id)
      .single()
    check(
      !unchanged.error && unchanged.data.music.excerpt.end === 19,
      'public snapshot independent of private editing',
    )
    await unpublishStory(a, id)
    const removed = await anonymous
      .from('public_stories')
      .select('id')
      .eq('id', id)
    check(
      !removed.error && removed.data.length === 0,
      'unpublish revokes public snapshot',
    )
    check(
      !(await fetch(publicPhotoUrl, { cache: 'no-store' })).ok,
      'unpublishing revokes public photo gateway access',
    )
    check(
      (await privatePhotoUrl(a, photo)).startsWith('https://'),
      'unpublishing preserves owner private photo',
    )
    if (!prior) {
      const panel = {
        show_count: true,
        interests: ['Synthetic books'],
        link: 'https://example.org/',
      }
      madeProfile = true
      const saved = await saveProfile(
        b,
        {
          username,
          display_name: 'Synthetic studio profile',
          bio: 'Synthetic fixture only',
          avatar: 'leaf',
          visible: false,
          joined_month: null,
          public_panel: panel,
        },
        null,
      )
      check(
        saved.public_panel?.link === panel.link,
        'public panel write confirmed',
      )
      const privatePanel = await anonymous
        .from('public_profiles')
        .select('public_panel')
        .eq('username', username)
      check(
        !privatePanel.error && privatePanel.data.length === 0,
        'hidden panel inaccessible anonymously',
      )
      await saveProfile(b, { ...saved, visible: true }, username)
      const visible = await anonymous
        .from('public_profiles')
        .select('public_panel')
        .eq('username', username)
        .single()
      check(
        !visible.error && visible.data.public_panel.link === panel.link,
        'opted-in public details visible',
      )
      const attack = await a
        .from('public_profiles')
        .update({ public_panel: {} })
        .eq('username', username)
        .select('username')
      const intact = await myProfile(b)
      check(
        (!!attack.error || attack.data?.length === 0) &&
          intact?.public_panel?.show_count === true,
        'owner role cannot edit another profile',
      )
      const ownerId = await anonymous
        .from('public_profiles')
        .select('user_id')
        .eq('username', username)
      check(!!ownerId.error, 'hidden profile ownership remains inaccessible')
    }
    result = { checks, skipped: false, profileTested: madeProfile }
  } catch (error) {
    failure = error
  }
  try {
    const pub = await a.from('public_stories').delete().eq('id', id)
    const entry = await a
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', aId)
    if (madeProfile) {
      const current = await myProfile(b)
      if (current?.username === username) await removePublicProfile(b, username)
      else if (current) throw Error('Synthetic profile cleanup requires review')
    }
    await cleanQueuedPhotos(a)
    if (pub.error || entry.error)
      throw Error('Synthetic studio cleanup not confirmed')
    const remains = await a.from('journal_entries').select('id').eq('id', id)
    if (remains.error || remains.data.length)
      throw Error('Synthetic studio entry remains')
  } catch (cleanupFailure) {
    throw new AggregateError(
      failure ? [failure, cleanupFailure] : [cleanupFailure],
      'Synthetic studio cleanup not confirmed',
      { cause: cleanupFailure },
    )
  }
  if (failure) throw failure
  if (!result) throw Error('Studio checks did not complete')
  return result
}
