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
    storyCount: number
    liveActivity: Partial<PublicProfile>
  } | null>(null)

  useEffect(() => {
    let active = true
    if (!client || !validUsername(username))
      return () => {
        active = false
      }
    const load = async () => {
      try {
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
            storyCount: storyResult.count,
            liveActivity,
          })
      } catch {
        if (active)
          setResult({
            key: requestKey,
            status: 'error',
            stories: [],
            more: false,
            storyCount: 0,
            liveActivity: {},
          })
      }
    }
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'hidden') void load()
    }
    void load()
    window.addEventListener('focus', refreshOnReturn)
    window.addEventListener('deardaily:public-stories', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)
    return () => {
      active = false
      window.removeEventListener('focus', refreshOnReturn)
      window.removeEventListener('deardaily:public-stories', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
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
        Add a username to preview your profile.
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
        <p className="tiny muted">Private preview · only you can see this.</p>
      )}
      {current?.storyCount === 0 && (
        <p className="tiny muted profile-preview-story-hint">
          Published stories will appear here.
        </p>
      )}
      <PublicProfileSurface
        profile={previewProfile}
        stories={current?.stories ?? []}
        photos={photos}
        storyCount={current?.storyCount ?? 0}
        page={page}
        more={current?.more ?? false}
        onPageChange={changePage}
        preview
      />
    </div>
  )
}
