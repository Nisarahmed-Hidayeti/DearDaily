import { useEffect, useState } from 'react'
import { LoadingState } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import { usePublicImages } from '../profile-images/ProfileImage'
import { liveRhythmEnabled } from './liveRhythm'
import { PublicProfileSurface } from './PublicProfile'
import { storyPage, validUsername } from './communityApi'
import type { CommunityStory, PublicProfile } from './communityApi'

export default function PublicProfilePreview({
  profile,
  savedUsername,
}: {
  profile: PublicProfile
  savedUsername: string | null
}) {
  const { client, session } = useAuth()
  const { username, visible, public_activity_live } = profile
  const isSavedUsername = username === savedUsername
  const photos = usePublicImages(isSavedUsername ? username : null)
  const [pagination, setPagination] = useState({ username, page: 0 })
  const page = pagination.username === username ? pagination.page : 0
  const requestKey = JSON.stringify([
    session?.user.id,
    username,
    page,
    visible,
    isSavedUsername,
    public_activity_live,
  ])
  const [result, setResult] = useState<{
    key: string
    status: 'ready' | 'error'
    stories: CommunityStory[]
    more: boolean
    liveActivity: Partial<PublicProfile>
  } | null>(null)

  useEffect(() => {
    let active = true
    if (!client || !validUsername(username))
      return () => {
        active = false
      }
    void (async () => {
      const storyResult = await storyPage(client, { username, page })
      let liveActivity: Partial<PublicProfile> = {}
      if (
        liveRhythmEnabled &&
        isSavedUsername &&
        visible &&
        public_activity_live
      ) {
        const activity = await client.rpc('get_public_writing_activity', {
          profile_username: username,
        })
        if (activity.error) throw activity.error
        liveActivity = activity.data ?? {}
      }
      if (active)
        setResult({
          key: requestKey,
          status: 'ready',
          stories: storyResult.stories,
          more: storyResult.more,
          liveActivity,
        })
    })().catch(() => {
      if (active)
        setResult({
          key: requestKey,
          status: 'error',
          stories: [],
          more: false,
          liveActivity: {},
        })
    })
    return () => {
      active = false
    }
  }, [
    client,
    isSavedUsername,
    page,
    requestKey,
    username,
    visible,
    public_activity_live,
  ])

  if (!validUsername(username))
    return (
      <p className="tiny muted">
        Choose a valid username to preview your public page.
      </p>
    )

  const current = result?.key === requestKey ? result : null
  if (client && !current) return <LoadingState>Loading preview…</LoadingState>
  if (current?.status === 'error')
    return <p role="alert">Preview unavailable. Try again in a moment.</p>

  const previewProfile = {
    ...profile,
    ...(current?.liveActivity ?? {}),
  }
  const changePage = (next: number | ((current: number) => number)) =>
    setPagination((currentPagination) => {
      const currentPage =
        currentPagination.username === username ? currentPagination.page : 0
      return {
        username,
        page: typeof next === 'function' ? next(currentPage) : next,
      }
    })

  return (
    <div className="profile-preview-surface">
      {!visible && (
        <p className="tiny muted">
          Private preview. Visitors can see this page after you make your
          profile public.
        </p>
      )}
      <PublicProfileSurface
        profile={previewProfile}
        stories={current?.stories ?? []}
        photos={photos}
        page={page}
        more={current?.more ?? false}
        onPageChange={changePage}
        preview
      />
    </div>
  )
}
