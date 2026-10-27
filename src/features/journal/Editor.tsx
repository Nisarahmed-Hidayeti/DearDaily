import { useState } from 'react'
import { Eye, LockKeyhole, Globe, Feather, X } from 'lucide-react'
import type { Mood, Visibility } from '../../data/demo'
import { PageHeading } from '../../components/Shared'
export default function Editor() {
  const [title, setTitle] = useState(''),
    [body, setBody] = useState(''),
    [mood, setMood] = useState<Mood>('Calm'),
    [tags, setTags] = useState<string[]>([]),
    [tag, setTag] = useState(''),
    [visibility, setVisibility] = useState<Visibility>('Private'),
    [preview, setPreview] = useState(false)
  const count = body.trim() ? body.trim().split(/\s+/).length : 0
  function addTag() {
    const value = tag.trim().replace(/^#/, '')
    if (value && !tags.includes(value)) setTags([...tags, value])
    setTag('')
  }
  return (
    <div className="page editor-page">
      <PageHeading
        eyebrow="Your journal / A blank canvas"
        title="Make room for your thoughts."
      >
        <button
          className="button secondary"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          <Eye size={16} />
          {preview ? 'Keep writing' : 'Preview'}
        </button>
      </PageHeading>
      <p className="draft-notice">
        <LockKeyhole size={14} />
        Temporary draft · Not saved. Leaving this editor clears your words.
      </p>
      <div className="editor-layout">
        <section className="writing-paper">
          <div className="row spread paper-meta">
            <span>
              {new Intl.DateTimeFormat('en', {
                dateStyle: 'long',
                timeZone: 'Europe/Istanbul',
              }).format(new Date())}
            </span>
            <Feather size={20} />
          </div>
          {preview ? (
            <article className="entry-preview">
              <h2>{title || 'Untitled entry'}</h2>
              <p>{body || 'Your words will appear here.'}</p>
            </article>
          ) : (
            <>
              <label className="sr-only" htmlFor="entry-title">
                Entry title
              </label>
              <input
                id="entry-title"
                className="title-input"
                placeholder="A new day, a new page…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <label className="sr-only" htmlFor="entry-body">
                Journal body
              </label>
              <textarea
                id="entry-body"
                placeholder="What’s on your mind today? Take your time. This space is yours."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </>
          )}
          <div className="paper-footer">
            <span>Let the words come as they are.</span>
            <output aria-live="polite">
              {count} {count === 1 ? 'word' : 'words'}
            </output>
          </div>
        </section>
        <aside className="entry-settings">
          <section className="panel">
            <h2>The little details</h2>
            <label htmlFor="visibility">Entry visibility</label>
            <div className="select-icon">
              {visibility === 'Private' ? (
                <LockKeyhole size={16} />
              ) : (
                <Globe size={16} />
              )}
              <select
                id="visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
              >
                <option>Private</option>
                <option>Public</option>
              </select>
            </div>
            <p className="tiny muted">
              {visibility === 'Private'
                ? 'Only you, when private storage is available.'
                : 'Preview preference only. This entry is not public.'}
            </p>
            <fieldset>
              <legend>How are you feeling?</legend>
              <div className="moods">
                {(['Calm', 'Happy', 'Reflective', 'Low'] as Mood[]).map(
                  (item, i) => (
                    <button
                      className={mood === item ? 'selected' : ''}
                      aria-pressed={mood === item}
                      onClick={() => setMood(item)}
                      key={item}
                    >
                      <span>{['☁', '☀', '☾', '☂'][i]}</span>
                      {item}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <label htmlFor="tags">Tags</label>
            <form
              className="tag-form"
              onSubmit={(e) => {
                e.preventDefault()
                addTag()
              }}
            >
              <input
                id="tags"
                placeholder="Add a little context"
                value={tag}
                maxLength={30}
                onChange={(e) => setTag(e.target.value)}
              />
              <button aria-label="Add tag" type="submit">
                +
              </button>
            </form>
            <div className="tag-list">
              {tags.map((item) => (
                <span className="tag" key={item}>
                  #{item}
                  <button
                    aria-label={`Remove ${item} tag`}
                    onClick={() => setTags(tags.filter((t) => t !== item))}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <label htmlFor="category">Journal category</label>
            <select id="category">
              <option>Personal</option>
              <option>Gratitude</option>
              <option>Growth</option>
              <option>Travel</option>
            </select>
          </section>
          <div className="save-panel">
            <p>This is a quiet place to try writing.</p>
            <span className="tiny muted">
              Saving and publishing require the backend planned for later
              phases. No draft is stored or sent.
            </span>
            <button className="button" disabled>
              Save draft — coming later
            </button>
            <button className="button secondary" disabled>
              Publish — unavailable
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
