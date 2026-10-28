import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeading, Scene } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import { journalEnabled, readStories } from '../journal/journalApi'
import type { PublicStory } from '../journal/journalApi'
import DemoExplore from './DemoExplore'
import {
  categories,
  communityEnabled,
  readingTime,
  storyPage,
} from '../community/communityApi'
import { StoryCard } from '../community/StoryCard'
import ReportStory from '../community/ReportStory'
import type { CommunityStory } from '../community/communityApi'
export { StoryDetail } from './DemoExplore'
export default function Explore() {
  return journalEnabled ? <PublicStories /> : <DemoExplore />
}
function PublicStories() {
  const { client } = useAuth()
  const [rows, setRows] = useState<PublicStory[]>([])
  const [status, setStatus] = useState('loading')
  const [retry, setRetry] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [oldest, setOldest] = useState(false)
  const [page, setPage] = useState(0)
  const [more, setMore] = useState(false)
  useEffect(() => {
    let active = true
    if (!client) return
    const timer = window.setTimeout(() => {
      void (
        communityEnabled
          ? storyPage(client, { search, category, oldest, page })
          : readStories(client).then((stories) => ({ stories, more: false }))
      )
        .then((data) => {
          if (active) {
            setRows(data.stories)
            setMore(data.more)
            setStatus('ready')
          }
        })
        .catch(() => {
          if (active) setStatus('error')
        })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [client, retry, search, category, oldest, page])
  if (!client)
    return (
      <div className="page">
        <h1>Public stories are not configured.</h1>
        <Link to="/explore/samples">Read the fictional examples</Link>
      </div>
    )
  return (
    <div className="page explore">
      <PageHeading
        eyebrow="Out in the world"
        title="Different lives. Shared feelings."
      />
      <p className="page-subtitle">
        Stories deliberately shared by their writers.
      </p>
      {status === 'loading' && <p role="status">Loading public stories…</p>}
      {status === 'error' && (
        <div role="alert">
          Could not load public stories.
          <button
            className="button secondary"
            onClick={() => setRetry((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {status === 'ready' && !rows.length && (
        <p className="panel">
          No stories published yet. Private drafts never appear here.
        </p>
      )}
      {communityEnabled && (
        <form
          className="explore-controls panel"
          onSubmit={(e) => e.preventDefault()}
        >
          <label>
            Search story titles
            <input
              type="search"
              maxLength={100}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(0)
              }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select
              value={oldest ? 'oldest' : 'newest'}
              onChange={(e) => {
                setOldest(e.target.value === 'oldest')
                setPage(0)
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </form>
      )}
      <div className="story-grid">
        {rows.map((r) => (
          <StoryCard key={r.id} story={r} />
        ))}
      </div>
      {communityEnabled && (
        <div className="row">
          <button
            className="button secondary"
            disabled={!page || status === 'loading'}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            className="button secondary"
            disabled={!more || status === 'loading'}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
      <Link className="text-link" to="/explore/samples">
        Explore fictional examples
      </Link>
    </div>
  )
}
export function PublishedStory() {
  const { id } = useParams()
  const { client } = useAuth()
  const [story, setStory] = useState<CommunityStory | null>(null)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    if (!client || !id) return
    let active = true
    const load = () => {
      void readStories(client, id)
        .then((rows) => {
          if (active) {
            setStory(rows[0] ?? null)
            setStatus('ready')
          }
        })
        .catch(() => {
          if (active) setStatus('error')
        })
    }
    load()
    window.addEventListener('focus', load)
    const timer = window.setInterval(load, 15000)
    return () => {
      active = false
      window.removeEventListener('focus', load)
      window.clearInterval(timer)
    }
  }, [client, id])
  if (!client)
    return (
      <div className="page">
        <h1>Public stories are not configured.</h1>
      </div>
    )
  return (
    <div className="page detail">
      <Link className="text-link" to="/explore">
        Back to stories
      </Link>
      {status === 'loading' ? (
        <p role="status">Loading story…</p>
      ) : status === 'error' ? (
        <p role="alert">
          Could not confirm whether this story is still public. Reload to retry.
        </p>
      ) : story ? (
        <>
          <p className="eyebrow">
            {story.public_category ?? 'Published story'} ·{' '}
            {readingTime(story.body)} min read ·{' '}
            {new Date(story.published_at).toLocaleDateString()}
          </p>
          {story.public_username ? (
            <Link className="text-link" to={`/u/${story.public_username}`}>
              @{story.public_username}
            </Link>
          ) : (
            <p className="muted">Anonymous writer</p>
          )}
          <h1>{story.title}</h1>
          <Scene />
          <article>
            <p style={{ whiteSpace: 'pre-wrap' }}>{story.body}</p>
          </article>
          <div className="tag-list">
            {story.public_tags?.map((t) => (
              <span className="tag" key={t}>
                #{t}
              </span>
            ))}
          </div>
          {communityEnabled && <ReportStory id={story.id} />}
        </>
      ) : (
        <h1>This story is not available.</h1>
      )}
    </div>
  )
}
