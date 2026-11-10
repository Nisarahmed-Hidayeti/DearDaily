import ActivityHeatmap from '../dashboard/ActivityHeatmap'
import { publicRhythmEnabled, rhythmActivity } from './publicRhythm'
import { ProfileImage, usePublicImages } from '../profile-images/ProfileImage'
import { studioPolishEnabled } from '../rich-editor/studioPolish'
import { validateProfilePanel } from './profilePanel'
import { publicStreaksEnabled } from './publicStreakConfig'
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
  const photos = usePublicImages(username)
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
          {photos?.banner ? (
            <div className="public-profile-banner">
              <ProfileImage
                publicId={photos.banner}
                position={photos.banner_position}
                fallback={null}
                alt="Author-selected public banner"
              />
            </div>
          ) : (
            photographicCovers.some((c) => c.id === profile.cover_id) && (
              <div className="public-profile-banner">
                <img
                  src={
                    photographicCovers.find((c) => c.id === profile.cover_id)!
                      .src
                  }
                  alt="Author-selected public banner"
                  loading="lazy"
                />
              </div>
            )
          )}
          <section className="profile-masthead panel">
            <div className="profile-identity">
              <span className="profile-avatar" aria-hidden="true">
                <ProfileImage
                  publicId={photos?.avatar}
                  fallback={avatars[profile.avatar]}
                  alt=""
                />
              </span>
              <PageHeading
                eyebrow={`@${profile.username}`}
                title={profile.display_name}
              />
              <p className="profile-bio">{profile.bio}</p>
            </div>
            <PublicRhythm
              count={profile.public_streak}
              name={profile.display_name}
              snapshot={profile.public_rhythm}
            />
          </section>
          <div className="profile-writing-layout">
            <div>
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
            </div>
            <ProfileDetails profile={profile} count={count} />
          </div>
        </>
      ) : (
        <h1>This public profile is not available.</h1>
      )}
    </div>
  )
}

function ProfileDetails({
  profile,
  count,
}: {
  profile: Profile
  count: number
}) {
  let panel
  try {
    panel = studioPolishEnabled
      ? validateProfilePanel(profile.public_panel ?? {})
      : null
  } catch {
    panel = null
  }
  const showCount = panel ? panel.show_count : true
  if (!showCount && !panel?.interests.length && !panel?.link) return null
  return (
    <aside className="profile-details" aria-label="Shared profile details">
      <dl>
        {showCount && (
          <>
            <dt>Published stories</dt>
            <dd>{count}</dd>
          </>
        )}
      </dl>
      {!!panel?.interests.length && (
        <div className="profile-interests">
          {panel.interests.filter(Boolean).map((interest, i) => (
            <span className="tag" key={i}>
              {interest}
            </span>
          ))}
        </div>
      )}
      {panel?.link && (
        <a href={panel.link} target="_blank" rel="noopener noreferrer">
          Personal website ↗
        </a>
      )}
    </aside>
  )
}

export function PublicRhythm({
  count,
  name = 'Writer',
  snapshot,
}: {
  count?: number | null
  name?: string
  snapshot?: unknown
}) {
  const firstName = name.trim().split(/\s+/)[0] || 'Writer'
  const title = `${firstName}’s writing rhythm`
  const activity = publicRhythmEnabled ? rhythmActivity(snapshot) : null
  if (activity)
    return (
      <aside
        className="profile-rhythm profile-rhythm-calendar"
        aria-label="Shared writing rhythm"
      >
        <ActivityHeatmap compact real title={title} activity={activity} />
        {publicStreaksEnabled && Number.isInteger(count) && count! >= 0 && (
          <small>
            {count} {count === 1 ? 'day' : 'days'} · shared streak
          </small>
        )}
      </aside>
    )
  if (
    !publicStreaksEnabled ||
    typeof count !== 'number' ||
    !Number.isInteger(count) ||
    count < 0
  )
    return null
  // The existing RPC shares a count snapshot only. Never infer calendar dates from it.
  return (
    <aside className="profile-rhythm" aria-label="Shared writing rhythm">
      <span className="eyebrow">{title}</span>
      <div className="profile-rhythm-count">
        <span aria-hidden="true">✓</span>
        <strong>{count}</strong>
        <span>{count === 1 ? 'day' : 'days'}</span>
      </div>
      <small>Shared streak snapshot</small>
    </aside>
  )
}
