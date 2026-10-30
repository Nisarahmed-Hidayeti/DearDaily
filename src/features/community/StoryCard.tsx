import { PublicAuthor } from './PublicAuthor'
import { PageCover } from '../rich-editor/PageCover'
import { Link } from 'react-router-dom'
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
        {s.writing_document?.page ||
        (s.cover_preset && s.cover_preset !== 'none') ? (
          <PageCover document={s.writing_document} preset={s.cover_preset} />
        ) : (
          <span className="story-icon-fallback" aria-hidden="true">
            {s.page_icon || '✧'}
          </span>
        )}
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
          <PublicAuthor username={s.public_username} />
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
