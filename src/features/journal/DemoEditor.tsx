import { useEffect, useState } from 'react'
import { Eye, LockKeyhole, Globe, Feather, X } from 'lucide-react'
import type { Mood, Visibility } from '../../data/demo'
import { formatLocalDate } from '../../lib/dates'
import { PageHeading, Modal } from '../../components/Shared'
import { downloadPublicStory } from './publicExport'
import { entryTitle, exportMarkdown, localDay, newDraft } from './journalApi'
import type { Draft } from './journalApi'
import { getDeviceDraft, saveDeviceDraft } from './localDrafts'
import { Link, useNavigate, useParams } from 'react-router-dom'
export default function Editor() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const [id] = useState(() => routeId ?? crypto.randomUUID())
  const [draft, setDraft] = useState<Draft>(
    () => getDeviceDraft(routeId ?? id) ?? newDraft(),
  )
  const { title, body, mood, tags } = draft
  const [tag, setTag] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('Private'),
    [preview, setPreview] = useState(false)
  const [reviewPublic, setReviewPublic] = useState(false)
  const [publishGate, setPublishGate] = useState(false)
  const [saveStatus, setSaveStatus] = useState<
    'editing' | 'saved' | 'unavailable'
  >('saved')
  useEffect(() => {
    if (
      !title.trim() &&
      !body.trim() &&
      !tags.length &&
      draft.mood === 'Calm' &&
      draft.category === 'Personal'
    )
      return
    const timer = window.setTimeout(() => {
      if (saveDeviceDraft(draft, id)) {
        setSaveStatus('saved')
        if (!routeId) navigate(`/app/write/${id}`, { replace: true })
      } else setSaveStatus('unavailable')
    }, 900)
    return () => window.clearTimeout(timer)
  }, [draft, id, navigate, routeId, title, body, tags.length])
  const changeDraft = (updates: Partial<typeof draft>) => {
    setSaveStatus('editing')
    setDraft((current) => ({ ...current, ...updates }))
  }
  const count = body.trim() ? body.trim().split(/\s+/).length : 0
  function addTag() {
    const value = tag.trim().replace(/^#/, '')
    if (value && !tags.includes(value)) changeDraft({ tags: [...tags, value] })
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
        <span>Private writing · Saved on this device as you type.</span>
        <span className="device-save-status" aria-live="polite">
          {saveStatus === 'editing'
            ? 'Saving…'
            : saveStatus === 'saved'
              ? 'Saved'
              : 'Could not save here'}
        </span>
      </p>
      <div className="editor-layout">
        <section className="writing-paper">
          <div className="row spread paper-meta">
            <span>{formatLocalDate(new Date())}</span>
            <Feather size={20} />
          </div>
          {preview ? (
            <article className="entry-preview">
              <h2>{entryTitle(title, localDay())}</h2>
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
                placeholder={entryTitle('', localDay())}
                value={title}
                onChange={(e) => changeDraft({ title: e.target.value })}
              />
              <label className="sr-only" htmlFor="entry-body">
                Journal body
              </label>
              <textarea
                id="entry-body"
                placeholder="What’s on your mind today? Take your time. This space is yours."
                value={body}
                onChange={(e) => changeDraft({ body: e.target.value })}
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
                      onClick={() => changeDraft({ mood: item })}
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
                    onClick={() =>
                      changeDraft({ tags: tags.filter((t) => t !== item) })
                    }
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <label htmlFor="category">Journal category</label>
            <select
              id="category"
              value={draft.category}
              onChange={(e) => changeDraft({ category: e.target.value })}
            >
              <option>Personal</option>
              <option>Gratitude</option>
              <option>Growth</option>
              <option>Travel</option>
            </select>
          </section>
          <div className="save-panel">
            <p>Your words stay in this browser until you choose to publish.</p>
            <span className="tiny muted">
              This draft saves automatically on this device. Sign in to publish
              it.
            </span>
            <button
              className="button secondary"
              onClick={() =>
                exportMarkdown({
                  title,
                  body,
                  mood,
                  tags,
                  category: 'Personal',
                  entry_date: localDay(),
                  status: 'draft',
                })
              }
            >
              Export private copy
            </button>
            <button
              className="button secondary"
              disabled={!body.trim()}
              onClick={() => setReviewPublic(true)}
            >
              Review public export
            </button>
            <button
              className="button"
              onClick={() => {
                saveDeviceDraft(draft, id)
                setSaveStatus('saved')
              }}
            >
              Save now
            </button>
            <button
              className="button secondary"
              disabled={!body.trim()}
              onClick={() => setPublishGate(true)}
            >
              Publish
            </button>
          </div>
        </aside>
      </div>
      {reviewPublic && (
        <Modal
          title="Review a public story export"
          onClose={() => setReviewPublic(false)}
        >
          <p>
            This downloads a standalone public story page. It does not publish
            online. Review every word below; only the title and text are
            included. Keep your private export separate.
          </p>
          <h3>{entryTitle(title, localDay())}</h3>
          <p
            style={{
              whiteSpace: 'pre-wrap',
              maxHeight: '40vh',
              overflow: 'auto',
            }}
          >
            {body}
          </p>
          <button
            className="button"
            onClick={() => {
              downloadPublicStory(entryTitle(title, localDay()), body)
              setReviewPublic(false)
            }}
          >
            Confirm public export
          </button>
        </Modal>
      )}
      {publishGate && (
        <Modal title="Sign in to publish" onClose={() => setPublishGate(false)}>
          <p>
            Your private draft is saved on this device. Sign in or create an
            account to publish a story.
          </p>
          <div className="row">
            <Link
              className="button"
              to={`/auth/sign-in?next=${encodeURIComponent('/app/journal')}`}
            >
              Sign in
            </Link>
            <Link
              className="button secondary"
              to={`/auth/sign-up?next=${encodeURIComponent('/app/journal')}`}
            >
              Create account
            </Link>
          </div>
        </Modal>
      )}
    </div>
  )
}
