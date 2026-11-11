import { validateMusic } from '../music/music'
import { entryIcon } from '../rich-editor/emojis'
import { PublicAuthor } from './PublicAuthor'
import { PageCover } from '../rich-editor/PageCover'
import { Link } from 'react-router-dom'
import type { CommunityStory } from './communityApi'
export function StoryCard({ story: s }: { story: CommunityStory }) {
  let hasMusic = false
  try {
    if (s.music) {
      validateMusic(s.music)
      hasMusic = true
    }
  } catch {
    /* Unknown public format remains a normal story. */
  }
  return (
    <article className="story-card">
      <Link
        to={`/explore/published/${s.id}`}
        className="story-art"
        aria-label={`Read ${s.title}`}
      >
        {s.writing_document?.page ||
        (s.cover_preset && s.cover_preset !== 'none') ? (
          <PageCover
            document={s.writing_document}
            preset={s.cover_preset}
            fallback={
              <span className="story-icon-fallback" aria-hidden="true">
                {entryIcon(s.writing_document, s.page_icon) || '✧'}
              </span>
            }
          />
        ) : (
          <span className="story-icon-fallback" aria-hidden="true">
            {entryIcon(s.writing_document, s.page_icon) || '✧'}
          </span>
        )}
      </Link>
      <div className="story-content">
        <h2>
          <Link to={`/explore/published/${s.id}`}>
            {entryIcon(s.writing_document, s.page_icon) && (
              <span className="story-page-icon" aria-hidden="true">
                {entryIcon(s.writing_document, s.page_icon)}
              </span>
            )}
            <span>{s.title}</span>
          </Link>
        </h2>
        <div className="story-metadata">
          <PublicAuthor username={s.public_username} compact />
          {s.public_category && <span>{s.public_category}</span>}
          <time dateTime={s.published_at}>
            {new Date(s.published_at).toLocaleDateString()}
          </time>
        </div>
        {hasMusic && (
          <Link
            className="story-listen"
            to={`/explore/published/${s.id}`}
            aria-label={`Listen with ${s.title}`}
          >
            ♫ Listen
          </Link>
        )}
      </div>
    </article>
  )
}
