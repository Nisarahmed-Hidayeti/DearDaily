import { Link } from 'react-router-dom'
import { Scene } from '../../components/Shared'
import { readingTime } from './communityApi'
import type { CommunityStory } from './communityApi'
export function StoryCard({ story: s }: { story: CommunityStory }) {
  return (
    <article className="story-card">
      <Link
        to={`/explore/published/${s.id}`}
        className="story-art"
        aria-label={`Read ${s.title}`}
      >
        <Scene />
      </Link>
      <div className="story-content">
        <p className="eyebrow">{s.public_category ?? 'Published story'}</p>
        <h2>
          <Link to={`/explore/published/${s.id}`}>{s.title}</Link>
        </h2>
        <p>
          {s.body.slice(0, 160)}
          {s.body.length > 160 ? '…' : ''}
        </p>
        <p className="story-byline">
          {s.public_username ? (
            <Link to={`/u/${s.public_username}`}>@{s.public_username}</Link>
          ) : (
            <span>Anonymous writer</span>
          )}
        </p>
        <small>
          {new Date(s.published_at).toLocaleDateString()} ·{' '}
          {readingTime(s.body)} min read
        </small>
        <div className="tag-list">
          {s.public_tags?.map((t) => (
            <span className="tag" key={t}>
              #{t}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
