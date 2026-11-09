import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authConfig } from '../../lib/supabase/client'
import {
  emptyImages,
  ownImages,
  saveImages,
  uploadProfileImage,
} from '../profile-images/api'
export async function hostedProfileImageChecks(
  A: SupabaseClient,
  B: SupabaseClient,
  aId: string,
  bId: string,
) {
  let checks = 0,
    stage = 'identity and empty settings',
    failure = '',
    securityPassed = false,
    cleanup = true,
    createdProfile = false
  const marker = 'Synthetic profile images ' + crypto.randomUUID(),
    handle = 'p' + crypto.randomUUID().replaceAll('-', '').slice(0, 20),
    assets: string[] = [],
    publicIds: string[] = []
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
  const request = (client: SupabaseClient, body: Record<string, unknown>) =>
    client.functions.invoke('media-gateway', { body })
  const publicGet = (id: string) =>
    fetch(`${authConfig!.url}/functions/v1/media-gateway?profile=${id}`, {
      cache: 'no-store',
    })
  const avatar = async (banner = false) => {
    const canvas = document.createElement('canvas')
    canvas.width = banner ? 1600 : 512
    canvas.height = banner ? 640 : 512
    const ctx = canvas.getContext('2d')
    if (!ctx) throw Error('Canvas unavailable')
    ctx.fillStyle = '#8968aa'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(Error('Canvas unavailable'))),
        'image/webp',
      ),
    )
  }
  try {
    const a = await A.auth.getUser(),
      b = await B.auth.getUser()
    check(
      !a.error &&
        !b.error &&
        a.data.user?.id === aId &&
        b.data.user?.id === bId &&
        aId !== bId,
    )
    check(
      (await ownImages(A)).version === 0 && (await ownImages(B)).version === 0,
    )
    const existing = await B.rpc('my_public_profile')
    check(!existing.error && !existing.data)
    stage = 'synthetic profile'
    const inserted = await B.from('public_profiles').insert({
      username: handle,
      display_name: marker,
      bio: '',
      avatar: 'leaf',
      visible: true,
    })
    check(!inserted.error)
    createdProfile = true
    stage = 'private upload'
    const blob = await avatar(),
      aPhoto = await uploadProfileImage(A, 'avatar', blob)
    assets.push(aPhoto)
    const bPhoto = await uploadProfileImage(B, 'avatar', blob)
    assets.push(bPhoto)
    const bBanner = await uploadProfileImage(B, 'banner', await avatar(true))
    assets.push(bBanner)
    check((await request(B, { action: 'profile-read', id: aPhoto })).error)
    check((await request(A, { action: 'profile-read', id: bPhoto })).error)
    check((await request(anon, { action: 'profile-read', id: aPhoto })).error)
    check(
      (await B.from('profile_image_assets').delete().eq('id', aPhoto)).error,
    )
    check(
      (
        await B.storage
          .from('deardaily-private')
          .download(`profile/${aId}/${aPhoto}.webp`)
      ).error,
    )
    stage = 'save/reload'
    let ownA = await saveImages(A, { ...emptyImages, avatar_asset: aPhoto }),
      ownB = await saveImages(B, {
        ...emptyImages,
        avatar_asset: bPhoto,
        banner_asset: bBanner,
        banner_position: 75,
      })
    check(
      (await ownImages(A)).avatar_asset === aPhoto &&
        (await ownImages(B)).avatar_asset === bPhoto &&
        (await ownImages(B)).banner_position === 75,
    )
    let shared = await anon.rpc('public_profile_images', { handle })
    check(!shared.error && !shared.data.avatar)
    check(!(await publicGet(aPhoto)).ok)
    check(
      (
        await request(B, {
          action: 'profile-save',
          ...ownB,
          avatar_asset: aPhoto,
        })
      ).error,
    )
    stage = 'explicit public copy'
    ownB = await saveImages(B, {
      ...ownB,
      share_avatar: true,
      share_banner: true,
    })
    shared = await anon.rpc('public_profile_images', { handle })
    check(
      !shared.error &&
        typeof shared.data.avatar === 'string' &&
        shared.data.avatar !== bPhoto,
    )
    publicIds.push(shared.data.avatar, shared.data.banner)
    check(shared.data.banner !== bBanner && shared.data.banner_position === 75)
    for (const id of publicIds) check((await publicGet(id)).ok)
    check(
      Object.keys(shared.data).sort().join(',') ===
        'avatar,banner,banner_position',
    )
    check(
      (
        await anon.storage
          .from('deardaily-story-media')
          .download('profile/' + shared.data.avatar + '.webp')
      ).error,
    )
    check(
      (
        await request(B, {
          action: 'profile-save',
          ...ownB,
          version: ownB.version - 1,
          share_avatar: false,
          share_banner: false,
        })
      ).error,
    )
    stage = 'hide and revoke'
    check(
      !(
        await B.from('public_profiles')
          .update({ visible: false })
          .eq('username', handle)
      ).error,
    )
    for (const id of publicIds) check(!(await publicGet(id)).ok)
    check(!(await anon.rpc('public_profile_images', { handle })).data)
    ownB = await ownImages(B)
    check(!ownB.share_avatar && ownB.avatar_asset === bPhoto)
    check(
      !(
        await B.from('public_profiles')
          .update({ visible: true })
          .eq('username', handle)
      ).error,
    )
    check(!(await anon.rpc('public_profile_images', { handle })).data.avatar)
    stage = 'remove and restore fallback'
    ownA = await saveImages(A, { ...ownA, avatar_asset: null })
    ownB = await saveImages(B, {
      ...ownB,
      avatar_asset: null,
      banner_asset: null,
    })
    check(!ownA.avatar_asset && !ownB.avatar_asset)
    securityPassed = true
  } catch (e) {
    failure = e instanceof Error ? e.message : 'Interrupted'
  } finally {
    // Remove only the test settings references; private objects require exact protected cleanup below.
    for (const client of [A, B])
      try {
        const images = await ownImages(client)
        if (
          assets.includes(images.avatar_asset ?? '') ||
          assets.includes(images.banner_asset ?? '')
        )
          await saveImages(client, {
            ...images,
            avatar_asset: null,
            banner_asset: null,
            share_avatar: false,
            share_banner: false,
          })
      } catch {
        cleanup = false
      }
    if (createdProfile) {
      const current = await B.rpc('my_public_profile')
      if (
        current.error ||
        current.data?.username !== handle ||
        current.data?.display_name !== marker ||
        current.data?.bio !== ''
      )
        cleanup = false
      else {
        const removed = await B.from('public_profiles')
          .delete()
          .eq('username', handle)
          .eq('display_name', marker)
          .eq('bio', '')
          .eq('avatar', 'leaf')
        if (removed.error || (await B.rpc('my_public_profile')).data)
          cleanup = false
      }
    }
    for (const client of [A, B])
      await request(client, {
        action: 'profile-cleanup',
        ids: [...assets, ...publicIds],
      }).catch(() => {
        cleanup = false
      })
  }
  const fixtureSettings = []
  for (const [client, slot] of [
    [A, 'A'],
    [B, 'B'],
  ] as const) {
    try {
      const state = await ownImages(client)
      fixtureSettings.push({
        slot,
        version: state.version,
        empty:
          !state.avatar_asset &&
          !state.banner_asset &&
          !state.share_avatar &&
          !state.share_banner,
      })
    } catch {
      cleanup = false
    }
  }
  return {
    fixtureSettings,
    passed: false,
    securityPassed,
    checks,
    distinctIdentities: aId !== bId,
    cleanup: false,
    stage,
    failure,
    marker,
    fixtureEntryIds: [],
    fixtureProfileUsername: handle,
    fixtureAssetIds: assets,
    fixturePublicIds: publicIds,
    profileCleanup: cleanup,
    protectedCleanupRequired: assets.length > 0,
    note: 'Do not enable production until exact protected asset/settings cleanup and final browser tests are verified.',
  }
}
