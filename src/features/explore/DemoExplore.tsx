import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowUpRight, ArrowLeft, LockKeyhole } from 'lucide-react'
import { PageHeading, Scene } from '../../components/Shared'
import { entries, stories } from '../../data/demo'
export default function Explore() {
  const [filter, setFilter] = useState('All stories')
  const filtered = stories.filter(
    (s) => filter === 'All stories' || s.category === filter,
  )
  return (
    <div className="page explore">
      <PageHeading
        eyebrow="Out in the world"
        title="Different lives. Shared feelings."
      />
      <p className="page-subtitle">
        Explore stories, find a little perspective, feel a little less alone.
      </p>
      <h2 className="explore-label">
        Explore stories <span className="badge">Fictional sample stories</span>
      </h2>
      <div className="filters" aria-label="Story categories">
        {['All stories', 'Personal growth', 'Everyday life', 'Reflections'].map(
          (category) => (
            <button
              aria-pressed={filter === category}
              className={filter === category ? 'selected' : ''}
              onClick={() => setFilter(category)}
              key={category}
            >
              {category}
            </button>
          ),
        )}
      </div>
      <div className="story-grid">
        {filtered.map((story) => (
          <Link
            to={`/explore/samples/${story.id}`}
            className="story-card"
            key={story.id}
          >
            <div className="story-art">
              <Scene kind={story.scene} />
              <span className="art-label">Sample story</span>
              <span className="art-arrow">
                <ArrowUpRight size={20} />
              </span>
            </div>
            <div className="story-content">
              <p className="eyebrow">
                {story.category} <span>· {story.minutes} min read</span>
              </p>
              <h2>{story.title}</h2>
              <p>{story.body.slice(0, 125)}…</p>
              <div className="author">
                <span className="avatar">{story.author.initials}</span>
                <div>
                  {story.author.name}
                  <small>{story.date}</small>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="panel">No sample stories in this category yet.</p>
      )}
      <div className="explore-end">
        <span>✧</span>
        <h2>Your ordinary might be someone’s inspiration.</h2>
        <p>For now, start with a page that’s just for you.</p>
        <Link className="text-link" to="/app/write">
          Write your own story <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  )
}
export function StoryDetail({ personal = false }: { personal?: boolean }) {
  const { id } = useParams()
  const story = stories.find((s) => s.id === id)
  const entry = personal ? entries.find((e) => e.id === id) : story
  if (!entry)
    return (
      <div className="page">
        <h1>That page is missing.</h1>
        <Link to={personal ? '/app' : '/explore'}>Go back</Link>
      </div>
    )
  return (
    <div className="page detail">
      <Link className="text-link" to={personal ? '/app' : '/explore'}>
        <ArrowLeft size={16} />
        Back to {personal ? 'your overview' : 'stories'}
      </Link>
      <p className="eyebrow">
        Fictional sample {personal ? 'entry' : 'story'} · {entry.date}
      </p>
      <h1>{entry.title}</h1>
      {!personal && story && (
        <div className="author">
          <span className="avatar">{story.author.initials}</span>
          {story.author.name} · {story.minutes} min read
        </div>
      )}
      {personal && (
        <span className="badge">
          <LockKeyhole size={12} />
          {entry.visibility} · Demo only
        </span>
      )}
      <Scene kind={story?.scene} />
      <article>
        {entry.body.split('\n\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </article>
      <p className="detail-note">
        This is fictional content created for the DearDaily prototype.
      </p>
    </div>
  )
}
