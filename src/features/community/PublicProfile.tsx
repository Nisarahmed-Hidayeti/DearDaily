import { photographicCovers } from '../rich-editor/covers'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { LoadingState, PageHeading } from '../../components/Shared'
import {
  avatars,
  communityEnabled,
  profileFields,
  storyPage,
  validUsername,
} from './communityApi'
import type { PublicProfile as Profile, CommunityStory } from './communityApi'
import { StoryCard } from './StoryCard'
export default function PublicProfile() {
  const { username = '' } = useParams()
  const { client } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stories, setStories] = useState<CommunityStory[]>([])
  const [page, setPage] = useState(0)
  const [more, setMore] = useState(false)
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    let active = true
    if (!client || !communityEnabled || !validUsername(username)) return
    void (async () => {
      const result = await client
        .from('public_profiles')
        .select(profileFields)
        .eq('username', username)
        .eq('visible', true)
        .maybeSingle()
      if (result.error) throw result.error
      const list = await storyPage(client, { username, page })
      const total = await client
        .from('public_stories')
        .select('id', { count: 'exact', head: true })
        .eq('public_username', username)
      if (total.error) throw total.error
      if (active) {
        setProfile(result.data as Profile | null)
        setStories(list.stories)
        setMore(list.more)
        setCount(total.count ?? 0)
        setStatus('ready')
      }
    })().catch(() => {
      if (active) setStatus('error')
    })
    return () => {
      active = false
    }
  }, [client, username, page])
  if (!validUsername(username))
    return (
      <div className="page">
        <h1>This public profile is not available.</h1>
      </div>
    )
  if (!communityEnabled)
    return (
      <div className="page">
        <h1>Public profiles are not enabled yet.</h1>
      </div>
    )
  return (
    <div className="page public-profile">
      <Link to="/explore" className="text-link">
        Back to Explore
      </Link>
      {status === 'loading' ? (
        <LoadingState>Loading profile…</LoadingState>
      ) : status === 'error' ? (
        <p role="alert">Profile unavailable. Reload to retry.</p>
      ) : profile ? (
        <>
          {photographicCovers.some((c) => c.id === profile.cover_id) && (
            <div className="public-profile-banner">
              <img
                src={
                  photographicCovers.find((c) => c.id === profile.cover_id)!.src
                }
                alt="Author-selected public banner"
                loading="lazy"
              />
            </div>
          )}
          <section className="profile-masthead panel">
            <span className="profile-avatar" aria-hidden="true">
              {avatars[profile.avatar]}
            </span>
            <PageHeading
              eyebrow={`@${profile.username}`}
              title={profile.display_name}
            />
            <p className="profile-bio">{profile.bio}</p>
            <p className="muted">
              {count} published {count === 1 ? 'story' : 'stories'}
              {profile.joined_month
                ? ` · Joined ${new Date(profile.joined_month + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
                : ''}
            </p>
          </section>
          <div className="story-grid">
            {stories.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
          {!stories.length && (
            <p className="panel">
              A quiet beginning. No attributed stories here yet.
            </p>
          )}
          <div className="row">
            <button
              className="button secondary"
              disabled={!page}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              className="button secondary"
              disabled={!more}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <h1>This public profile is not available.</h1>
      )}
    </div>
  )
}
