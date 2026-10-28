import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  communityEnabled,
  categories,
  myProfile,
} from '../community/communityApi'
import type { PublicProfile } from '../community/communityApi'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Eye, Feather, LockKeyhole, X } from 'lucide-react'
import type { Mood } from '../../data/demo'
import { Modal, PageHeading } from '../../components/Shared'
import { exportMarkdown } from './journalApi'
import { useJournalEntry } from './useJournalEntry'

export default function CloudEditor() {
  const { id } = useParams()
  return <EntryForm key={id ?? 'new'} existingId={id} />
}
function EntryForm({ existingId }: { existingId?: string }) {
  const state = useJournalEntry(existingId)
  const { draft, setDraft, ready, busy, error, dirty, row, published } = state
  const [preview, setPreview] = useState(false)
  const [tag, setTag] = useState('')
  const [confirmation, setConfirmation] = useState<
    'publish' | 'unpublish' | 'delete' | null
  >(null)
  const navigate = useNavigate()
  const { client } = useAuth()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [byline, setByline] = useState(false)
  const [publicCategory, setPublicCategory] = useState('Uncategorized')
  const [publicTags, setPublicTags] = useState('')
  useEffect(() => {
    let active = true
    if (communityEnabled && client)
      void myProfile(client)
        .then((p) => {
          if (active) setProfile(p)
        })
        .catch(() => {})
    return () => {
      active = false
    }
  }, [client])
  const count = draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0
  const patch = (values: Partial<typeof draft>) =>
    setDraft((current) => ({ ...current, ...values }))
  return (
    <div className="page editor-page">
      <PageHeading
        eyebrow="Your private journal"
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
      <p className="draft-notice" role="status">
        <LockKeyhole size={14} />
        {busy
          ? 'Saving or confirming your action…'
          : !ready
            ? 'Loading your entry…'
            : error
              ? 'Not confirmed — keep or export your words.'
              : dirty
                ? 'Unsaved changes · autosave pending'
                : row
                  ? 'Saved to your private account'
                  : 'A new private page · start writing'}
      </p>
      {error && (
        <div role="alert" className="auth-notice">
          <p>{error}</p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void state.save()}
          >
            Retry save
          </button>
          {row || existingId ? (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    'Reload the server version? Unsaved edits will be replaced. Export them first.',
                  )
                )
                  void state.reload()
              }}
            >
              Reload server version
            </button>
          ) : null}
        </div>
      )}
      <div className="editor-layout">
        <section className="writing-paper">
          <div className="row spread paper-meta">
            <label>
              Entry date{' '}
              <input
                aria-label="Entry date"
                type="date"
                value={draft.entry_date}
                disabled={!ready}
                onChange={(e) => patch({ entry_date: e.target.value })}
              />
            </label>
            <Feather size={20} />
          </div>
          {preview ? (
            <article className="entry-preview">
              <h2>{draft.title || 'Untitled entry'}</h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>
                {draft.body || 'Your words will appear here.'}
              </p>
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
                value={draft.title}
                maxLength={200}
                disabled={!ready}
                onChange={(e) => patch({ title: e.target.value })}
              />
              <label className="sr-only" htmlFor="entry-body">
                Journal body
              </label>
              <textarea
                id="entry-body"
                placeholder="What’s on your mind today? Take your time. This space is yours."
                value={draft.body}
                maxLength={100000}
                disabled={!ready}
                onChange={(e) => patch({ body: e.target.value })}
              />
            </>
          )}
          <div className="paper-footer">
            <span>Your words stay private until you choose to publish.</span>
            <output aria-live="polite">
              {count} {count === 1 ? 'word' : 'words'}
            </output>
          </div>
        </section>
        <aside className="entry-settings">
          <section className="panel">
            <h2>The little details</h2>
            <p>
              <LockKeyhole size={14} /> Private source entry
            </p>
            <fieldset disabled={!ready}>
              <legend>How are you feeling?</legend>
              <div className="moods">
                {(['Calm', 'Happy', 'Reflective', 'Low'] as Mood[]).map(
                  (m, i) => (
                    <button
                      key={m}
                      className={draft.mood === m ? 'selected' : ''}
                      aria-pressed={draft.mood === m}
                      onClick={() => patch({ mood: m })}
                    >
                      <span>{['☁', '☀', '☾', '☂'][i]}</span>
                      {m}
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
                const value = tag.trim().replace(/^#/, '')
                if (
                  value &&
                  draft.tags.length < 10 &&
                  !draft.tags.includes(value)
                )
                  patch({ tags: [...draft.tags, value] })
                setTag('')
              }}
            >
              <input
                id="tags"
                value={tag}
                maxLength={30}
                disabled={!ready}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Add a little context"
              />
              <button aria-label="Add tag" disabled={!ready}>
                +
              </button>
            </form>
            <div className="tag-list">
              {draft.tags.map((t) => (
                <span className="tag" key={t}>
                  #{t}
                  <button
                    aria-label={`Remove ${t} tag`}
                    onClick={() =>
                      patch({ tags: draft.tags.filter((x) => x !== t) })
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
              disabled={!ready}
              value={draft.category}
              onChange={(e) => patch({ category: e.target.value })}
            >
              {['Personal', 'Gratitude', 'Growth', 'Travel'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </section>
          <div className="save-panel">
            <button
              className="button"
              disabled={!ready || busy}
              onClick={() => void state.save(true)}
            >
              Save entry
            </button>
            <button
              className="button secondary"
              onClick={() => exportMarkdown(draft)}
            >
              Export private copy
            </button>
            <p className="tiny muted">
              A public story is a separate copy. Mood, tags, category and
              account details stay private. Editing this draft does not update
              an existing story.
            </p>
            <button
              className="button secondary"
              disabled={
                !row ||
                busy ||
                dirty ||
                !draft.title.trim() ||
                !draft.body.trim()
              }
              onClick={() => setConfirmation('publish')}
            >
              {published ? 'Update public story' : 'Publish story'}
            </button>
            {published && (
              <>
                <Link
                  className="text-link"
                  to={`/explore/published/${state.id}`}
                >
                  View public story
                </Link>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setConfirmation('unpublish')}
                >
                  Unpublish story
                </button>
              </>
            )}
            {row && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setConfirmation('delete')}
              >
                Delete entry
              </button>
            )}
          </div>
        </aside>
      </div>
      {confirmation && (
        <Modal
          title={
            confirmation === 'publish'
              ? 'Publish this story?'
              : confirmation === 'unpublish'
                ? 'Unpublish this story?'
                : 'Delete this entry?'
          }
          onClose={() => {
            if (!busy) setConfirmation(null)
          }}
        >
          <p>
            {confirmation === 'publish'
              ? 'Everyone will be able to read this title and the complete text below. Public copies may be saved or shared by readers. Only continue if you want these words public.'
              : confirmation === 'unpublish'
                ? 'Remove the public copy from DearDaily. Your private entry stays saved. This cannot remove copies already saved by other people.'
                : 'Permanently delete your entry and its public copy, if any. Export a copy first if you need it.'}
          </p>
          {confirmation === 'publish' && (
            <article className="entry-preview">
              {communityEnabled && (
                <fieldset disabled={busy}>
                  <legend>Deliberately public details</legend>
                  <label>
                    Public category
                    <select
                      value={publicCategory}
                      onChange={(e) => setPublicCategory(e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Public tags (up to 5, comma separated)
                    <input
                      maxLength={154}
                      value={publicTags}
                      onChange={(e) => setPublicTags(e.target.value)}
                    />
                  </label>
                  {profile?.visible ? (
                    <label className="row">
                      <input
                        type="checkbox"
                        checked={byline}
                        onChange={(e) => setByline(e.target.checked)}
                      />
                      Attribute this story to @{profile.username}
                    </label>
                  ) : (
                    <p>
                      Anonymous writer. Opt into a public profile separately to
                      add a byline.
                    </p>
                  )}
                  <p>
                    Only these selected details are public. Each update replaces
                    the public metadata shown here; private tags and category
                    are never copied automatically.
                  </p>
                </fieldset>
              )}
              <h3>{row?.title}</h3>
              <p
                style={{
                  whiteSpace: 'pre-wrap',
                  maxHeight: '40vh',
                  overflow: 'auto',
                }}
              >
                {row?.body}
              </p>
            </article>
          )}
          <button
            className="button"
            disabled={
              busy ||
              (confirmation === 'publish' &&
                (publicTags.split(',').filter((t) => t.trim()).length > 5 ||
                  publicTags.split(',').some((t) => t.trim().length > 30)))
            }
            onClick={async () => {
              const kind = confirmation
              const done = await state.action(
                kind,
                communityEnabled
                  ? {
                      public_username:
                        byline && profile?.visible ? profile.username : null,
                      public_category: publicCategory,
                      public_tags: publicTags
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    }
                  : undefined,
              )
              setConfirmation(null)
              if (done && kind === 'delete') navigate('/app', { replace: true })
            }}
          >
            Confirm {confirmation}
          </button>
        </Modal>
      )}
    </div>
  )
}
