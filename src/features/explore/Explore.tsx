import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeading, Scene } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import { journalEnabled, readStories } from '../journal/journalApi'
import type { PublicStory } from '../journal/journalApi'
import DemoExplore from './DemoExplore'
export { StoryDetail } from './DemoExplore'
export default function Explore() {
  return journalEnabled ? <PublicStories /> : <DemoExplore />
}
function PublicStories() {
  const { client } = useAuth()
  const [rows, setRows] = useState<PublicStory[]>([])
  const [status, setStatus] = useState('loading')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    if (!client) return
    void readStories(client)
      .then((data) => {
        if (active) {
          setRows(data)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [client, retry])
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
      <div className="story-grid">
        {rows.map((r) => (
          <Link
            to={`/explore/published/${r.id}`}
            key={r.id}
            className="story-card"
          >
            <div className="story-art">
              <Scene />
            </div>
            <div className="story-content">
              <p className="eyebrow">Published story</p>
              <h2>{r.title}</h2>
              <p>{r.body.slice(0, 125)}…</p>
              <small>{new Date(r.published_at).toLocaleDateString()}</small>
            </div>
          </Link>
        ))}
      </div>
      <p className="tiny muted">Showing the latest 100 published stories.</p>
      <Link className="text-link" to="/explore/samples">
        Explore fictional examples
      </Link>
    </div>
  )
}
export function PublishedStory() {
  const { id } = useParams()
  const { client } = useAuth()
  const [story, setStory] = useState<PublicStory | null>(null)
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
          <p className="eyebrow">Published story</p>
          <h1>{story.title}</h1>
          <Scene />
          <article>
            <p style={{ whiteSpace: 'pre-wrap' }}>{story.body}</p>
          </article>
        </>
      ) : (
        <h1>This story is not available.</h1>
      )}
    </div>
  )
}
