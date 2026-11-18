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
  const { client } = useAuth()
  const { username, visible, public_activity_live } = profile
  const isSavedUsername = username === savedUsername
  const photos = usePublicImages(isSavedUsername ? username : null)
  const [stories, setStories] = useState<CommunityStory[]>([])
  const [page, setPage] = useState(0)
  const [more, setMore] = useState(false)
  const [liveActivity, setLiveActivity] = useState<{
    username: string
    values: Partial<PublicProfile>
  } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let active = true
    setStatus('loading')
    if (!client || !validUsername(username)) {
      setStories([])
      setMore(false)
      setLiveActivity(null)
      setStatus('ready')
      return () => {
        active = false
      }
    }
    void (async () => {
      const result = await storyPage(client, {
        username,
        page,
      })
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
        if (activity.data && active)
          setLiveActivity({ username, values: activity.data })
      }
      if (active) {
        setStories(result.stories)
        setMore(result.more)
        setStatus('ready')
      }
    })().catch(() => {
      if (active) setStatus('error')
    })
    return () => {
      active = false
    }
  }, [client, isSavedUsername, page, username, visible, public_activity_live])

  useEffect(() => {
    setPage(0)
  }, [username])

  if (!validUsername(profile.username))
    return (
      <p className="tiny muted">
        Choose a valid username to preview your public page.
      </p>
    )
  if (status === 'loading') return <LoadingState>Loading preview…</LoadingState>
  if (status === 'error')
    return <p role="alert">Preview unavailable. Try again in a moment.</p>

  const previewProfile = {
    ...profile,
    ...(liveActivity?.username === username ? liveActivity.values : {}),
  }
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
        stories={stories}
        photos={photos}
        page={page}
        more={more}
        onPageChange={setPage}
        preview
      />
    </div>
  )
}
