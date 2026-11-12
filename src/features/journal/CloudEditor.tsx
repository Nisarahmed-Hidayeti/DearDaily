import type { Appearance } from '../appearance/appearance'
import { studioPolishEnabled, writingFonts } from '../rich-editor/studioPolish'
import { VoiceNotes } from '../audio/VoiceNotes'
import { voiceNotesEnabled } from '../audio/audio'
import { uploadVoice, approvedVoice } from '../audio/audioApi'
import { MoodPicker } from './MoodPicker'
import { journalCategories } from './entryMetadata'
import { uploadEntryPhoto } from './entryPhotoUpload'
import { WritingMusic } from '../music/WritingMusic'
import { persistentMusicEnabled, publicMusic, musicUrl } from '../music/music'
import { entryIcon } from '../rich-editor/emojis'
import { EntryDetails } from './EntryDetails'
import {
  proposedPublicationPlan,
  defaultPublicationPlan,
  publicationTags,
  type PublicationPlan,
} from './publicationPlan'
import { mediaEnabled, documentAssetIds } from '../media/mediaApi'
import { useAppearance } from '../appearance/AppearanceProvider'
import { PageAppearance } from '../rich-editor/PageAppearance'
import { PageCover } from '../rich-editor/PageCover'
import { useWritingFocus } from '../rich-editor/useWritingFocus'
import { LoadingState } from '../../components/Shared'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { communityEnabled, myProfile } from '../community/communityApi'
import type { PublicProfile } from '../community/communityApi'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Eye, LockKeyhole, X } from 'lucide-react'
import { Modal, PageHeading } from '../../components/Shared'
import { exportMarkdown } from './journalApi'
import { useJournalEntry } from './useJournalEntry'
import { richEditorEnabled } from '../rich-editor/config'
const RichWriter = lazy(() =>
  import('../rich-editor/RichWriter').then((module) => ({
    default: module.RichWriter,
  })),
)
import { RichRead } from '../rich-editor/RichRead'
import { documentFromText, documentText } from '../rich-editor/document'

export default function CloudEditor() {
  const { id } = useParams()
  const location = useLocation()
  // Adopt the saved URL without replacing the live editor or upload dialog.
  // A different existing entry still receives an independent component lifetime.
  const [{ newId, routeKey }, setNewPage] = useState(() => ({
    newId: crypto.randomUUID(),
    routeKey: location.key,
  }))
  if (!id && routeKey !== location.key)
    setNewPage({ newId: crypto.randomUUID(), routeKey: location.key })
  return <EntryForm key={id ?? newId} existingId={id} newId={newId} />
}
function EntryForm({
  existingId,
  newId,
}: {
  existingId?: string
  newId?: string
}) {
  const state = useJournalEntry(existingId, newId)
  const { draft, setDraft, ready, busy, error, dirty, row, published } = state
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        event.key.toLowerCase() === 's'
      ) {
        event.preventDefault()
        if (!event.repeat && !event.isComposing && ready && !busy && dirty)
          void state.save(true)
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [state, ready, busy, dirty])
  const [preview, setPreview] = useState(false)
  const selection = useRef<Range | null>(null)
  const togglePreview = () => {
    if (!preview) {
      const current = document.getSelection()
      if (
        current?.rangeCount &&
        current.anchorNode?.parentElement?.closest('.tiptap')
      )
        selection.current = current.getRangeAt(0).cloneRange()
    }
    setPreview(!preview)
    if (preview)
      requestAnimationFrame(() => {
        const body = document.querySelector<HTMLElement>(
          '.editor-canvas .tiptap, .editor-canvas textarea',
        )
        body?.focus({ preventScroll: true })
        if (selection.current?.startContainer.isConnected) {
          const current = document.getSelection()
          current?.removeAllRanges()
          current?.addRange(selection.current)
        }
      })
  }
  const { focus, setFocus } = useWritingFocus()
  const {
    appearance,
    save: saveAppearance,
    status: appearanceStatus,
  } = useAppearance()
  const [appearanceError, setAppearanceError] = useState('')
  const savePagePreference = async (next: Partial<Appearance>) => {
    setAppearanceError('')
    if (!(await saveAppearance({ ...appearance, ...next }, appearance)))
      setAppearanceError(
        'Writing preference not synced. Your words are unchanged. Retry in Appearance settings.',
      )
  }
  const [fontChoice, setFont] = useState<string | null>(null)
  const font = fontChoice ?? appearance.font
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [widthChoice, setWidth] = useState<string | null>(null)
  const width = widthChoice ?? appearance.width
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  const [tag, setTag] = useState('')
  const [confirmation, setConfirmation] = useState<
    'publish' | 'unpublish' | 'delete' | null
  >(null)
  const navigate = useNavigate()
  const { client } = useAuth()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const photoApprovalKey = documentAssetIds(row?.writing_document)
    .sort()
    .join(',')
  const [approvedPhotosKey, setApprovedPhotosKey] = useState<string | null>(
    null,
  )
  const approvePhotos =
    Boolean(photoApprovalKey) && approvedPhotosKey === photoApprovalKey
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
  const plan =
    draft.writing_document?.publication ??
    (state.publicMetadata
      ? {
          category: state.publicMetadata.public_category ?? 'Uncategorized',
          tags: state.publicMetadata.public_tags?.join(', ') ?? '',
          byline: !!state.publicMetadata.public_username,
        }
      : communityEnabled
        ? proposedPublicationPlan(draft)
        : defaultPublicationPlan)
  const { category: publicCategory, tags: publicTags, byline } = plan
  const patchPlan = (values: Partial<PublicationPlan>) =>
    setDraft((current) => ({
      ...current,
      writing_document: {
        ...(current.writing_document ?? documentFromText(current.body)),
        publication: { ...plan, ...values },
      },
    }))
  const toggleDetails = () => {
    const next = !detailsOpen
    // Lazily retain choices from an older published copy when its editor is opened.
    if (
      next &&
      richEditorEnabled &&
      !draft.writing_document?.publication &&
      state.publicMetadata
    )
      patchPlan({})
    setDetailsOpen(next)
  }
  let invalidPublicTags = false
  try {
    publicationTags(publicTags)
  } catch {
    invalidPublicTags = true
  }
  return (
    <div
      className={`page editor-page ${richEditorEnabled ? 'editor-lab notion-editor' : ''} ${focus ? 'writer-focus' : ''} ${detailsOpen ? 'details-open' : ''}`}
      data-unsaved-writing={dirty || busy}
      data-font={font}
      data-width={width}
    >
      {richEditorEnabled ? (
        <header className="writer-topbar">
          <Link to="/app/journal" className="writer-breadcrumb">
            Journal <span>/</span> <span>Private page</span>
          </Link>
          <div className="row">
            <button
              className="quiet"
              disabled={!ready || busy}
              onClick={() => void state.save(true)}
            >
              {busy ? 'Saving…' : 'Save now'}
            </button>
            <button
              className="quiet focus-toggle"
              aria-pressed={focus}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setDetailsOpen(false)
                setFocus(true)
              }}
            >
              Focus mode
            </button>
            <button
              className="quiet"
              aria-pressed={preview}
              onMouseDown={(e) => e.preventDefault()}
              onClick={togglePreview}
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
            <button
              className="quiet"
              aria-expanded={detailsOpen}
              onClick={toggleDetails}
            >
              Share & details
            </button>
            <details className="writer-page-options">
              <summary>Page options</summary>
              <div className="writer-preferences">
                <label>
                  Writing font
                  <select
                    value={font}
                    disabled={appearanceStatus === 'saving'}
                    onChange={(e) => {
                      const font = e.target.value as Appearance['font']
                      setFont(font)
                      void savePagePreference({ font })
                    }}
                  >
                    {(studioPolishEnabled
                      ? writingFonts
                      : writingFonts.slice(0, 2)
                    ).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Page width
                  <select
                    value={width}
                    disabled={appearanceStatus === 'saving'}
                    onChange={(e) => {
                      const width = e.target.value as Appearance['width']
                      setWidth(width)
                      void savePagePreference({ width })
                    }}
                  >
                    <option value="narrow">Narrow</option>
                    <option value="standard">Standard</option>
                    <option value="wide">Wide</option>
                  </select>
                </label>
              </div>
            </details>
            <button
              className="focus-exit"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setFocus(false)}
            >
              Exit Focus Mode <kbd>Esc</kbd>
            </button>
          </div>
        </header>
      ) : (
        <>
          <PageHeading
            eyebrow="Your private journal"
            title="Make room for your thoughts."
          >
            <button
              className="button secondary"
              aria-pressed={preview}
              onMouseDown={(e) => e.preventDefault()}
              onClick={togglePreview}
            >
              <Eye size={16} />
              {preview ? 'Edit' : 'Preview'}
            </button>
          </PageHeading>
        </>
      )}
      <p
        className="draft-notice"
        data-save-state={
          busy ? 'saving' : dirty ? 'unsaved' : row ? 'saved' : 'new'
        }
        role="status"
        hidden={ready && !busy && !dirty && !row && !error && online}
      >
        {busy || !ready ? (
          <span className="loading-orbit" aria-hidden="true" />
        ) : (
          <LockKeyhole size={14} />
        )}
        {!online
          ? 'Offline · your unsaved writing is still in this tab. Export a copy before leaving.'
          : busy
            ? 'Saving or confirming your action…'
            : !ready
              ? 'Loading your entry…'
              : error
                ? 'Not confirmed — keep or export your words.'
                : dirty
                  ? 'Unsaved changes · autosave pending'
                  : row
                    ? 'Saved to your private account'
                    : ''}
      </p>
      {appearanceError && <p role="alert">{appearanceError}</p>}
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
          {richEditorEnabled && (
            <>
              {preview && (
                <PageCover
                  privateMedia
                  document={draft.writing_document}
                  preset={draft.cover_preset}
                />
              )}
              {!preview && (
                <PageAppearance
                  showCover
                  onUpload={
                    mediaEnabled && client
                      ? (file) =>
                          uploadEntryPhoto(
                            client,
                            file,
                            documentAssetIds(draft.writing_document).length,
                            row,
                            () => state.save(),
                          )
                      : undefined
                  }
                  disabled={!ready}
                  document={
                    draft.writing_document ?? documentFromText(draft.body)
                  }
                  preset={draft.cover_preset}
                  icon={entryIcon(draft.writing_document, draft.page_icon)}
                  onApply={(style) =>
                    patch({
                      writing_document: {
                        ...style.document,
                        content: (
                          draft.writing_document ?? documentFromText(draft.body)
                        ).content,
                      },
                      cover_preset: style.preset,
                      page_icon: style.icon,
                    })
                  }
                />
              )}
            </>
          )}
          {preview && (
            <article className="entry-preview">
              <div className="editor-title-row">
                <h2>{draft.title || 'Untitled entry'}</h2>
                <WritingMusic
                  value={persistentMusicEnabled ? draft.music : undefined}
                />
              </div>
              <RichRead
                privateMedia
                document={draft.writing_document}
                fallback={draft.body || 'Your words will appear here.'}
              />
            </article>
          )}
          <div className="editor-canvas" hidden={preview}>
            <div className="editor-title-row">
              <label className="sr-only" htmlFor="entry-title">
                Entry title
              </label>
              <input
                id="entry-title"
                className="title-input"
                placeholder={
                  richEditorEnabled ? 'Untitled' : 'A new day, a new page…'
                }
                value={draft.title}
                maxLength={200}
                disabled={!ready}
                onChange={(e) => patch({ title: e.target.value })}
              />
              <WritingMusic
                value={persistentMusicEnabled ? draft.music : undefined}
                disabled={!ready || preview}
                onChange={
                  persistentMusicEnabled && !preview
                    ? (music) => patch({ music })
                    : undefined
                }
              />
            </div>
            <label className="sr-only" htmlFor="entry-body">
              Journal body
            </label>
            {richEditorEnabled ? (
              <Suspense
                fallback={
                  <LoadingState>Preparing your writing space…</LoadingState>
                }
              >
                <RichWriter
                  onUpload={
                    mediaEnabled && client
                      ? (file) =>
                          uploadEntryPhoto(
                            client,
                            file,
                            documentAssetIds(draft.writing_document).length,
                            row,
                            () => state.save(),
                          )
                      : undefined
                  }
                  disabled={!ready}
                  value={draft.writing_document ?? documentFromText(draft.body)}
                  onChange={(document) =>
                    patch({
                      writing_document: document,
                      body: documentText(document),
                    })
                  }
                />
              </Suspense>
            ) : (
              <textarea
                id="entry-body"
                placeholder="What’s on your mind today? Take your time. This space is yours."
                value={draft.body}
                maxLength={100000}
                disabled={!ready}
                onChange={(e) => patch({ body: e.target.value })}
              />
            )}
          </div>
          {voiceNotesEnabled && (
            <VoiceNotes
              notes={draft.voice_notes ?? []}
              disabled={!ready}
              onChange={
                preview ? undefined : (voice_notes) => patch({ voice_notes })
              }
              onUpload={
                !preview && client
                  ? async (blob) => {
                      const confirmed = row ?? (await state.save())
                      if (!confirmed)
                        throw Error(
                          'Save your private page before uploading audio',
                        )
                      return uploadVoice(client, confirmed.id, blob)
                    }
                  : undefined
              }
            />
          )}
          <div className="paper-footer">
            <output aria-live="polite">
              {count} {count === 1 ? 'word' : 'words'}
            </output>
          </div>
        </section>
        <EntryDetails
          open={!richEditorEnabled || detailsOpen}
          onClose={() => setDetailsOpen(false)}
        >
          {richEditorEnabled && (
            <button
              className="button mobile-details-save"
              disabled={!ready || busy}
              onClick={() => void state.save(true)}
            >
              {busy ? 'Saving…' : 'Save details'}
            </button>
          )}
          <section className="panel">
            <MoodPicker
              value={draft.mood}
              onChange={(mood) => patch({ mood })}
              disabled={!ready}
            />

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
              {journalCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </section>
          {invalidPublicTags && (
            <p role="alert">
              Choose up to five public tags, each under 31 characters. Private
              saving is still available.
            </p>
          )}
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
            <button
              className="button secondary"
              disabled={
                !row ||
                busy ||
                dirty ||
                !draft.title.trim() ||
                !draft.body.trim() ||
                invalidPublicTags
              }
              aria-describedby={
                !row || dirty || !draft.title.trim() || !draft.body.trim()
                  ? 'publish-explanation'
                  : undefined
              }
              onClick={() => {
                setDetailsOpen(false)
                setApprovedPhotosKey(null)
                if (
                  communityEnabled &&
                  richEditorEnabled &&
                  !draft.writing_document?.publication
                )
                  patchPlan({})
                setConfirmation('publish')
              }}
            >
              {published ? 'Update public story' : 'Publish story'}
            </button>
            {(!row || dirty || !draft.title.trim() || !draft.body.trim()) && (
              <p id="publish-explanation" className="tiny muted">
                {!row
                  ? 'Save your entry before publishing.'
                  : dirty
                    ? 'Wait for your latest edits to save before publishing.'
                    : !draft.title.trim() || !draft.body.trim()
                      ? 'Add a title and some words before publishing.'
                      : ''}
              </p>
            )}
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
                  onClick={() => {
                    setDetailsOpen(false)
                    setConfirmation('unpublish')
                  }}
                >
                  Unpublish story
                </button>
              </>
            )}
            {row && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setDetailsOpen(false)
                  setConfirmation('delete')
                }}
              >
                Delete entry
              </button>
            )}
          </div>
        </EntryDetails>
      </div>
      {confirmation && (
        <Modal
          title={
            confirmation === 'publish'
              ? 'Ready to publish?'
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
              ? 'Publish this snapshot with only the category, tags, identity and photos you approve below. Your mood, journal date and account data stay private.'
              : confirmation === 'unpublish'
                ? 'Remove the public copy from DearDaily. Your private entry stays saved. This cannot remove copies already saved by other people.'
                : 'Permanently delete your entry and its public copy, if any. Export a copy first if you need it.'}
          </p>
          {confirmation === 'publish' && (
            <article className="entry-preview">
              <dl className="publication-receipt">
                {voiceNotesEnabled && (
                  <>
                    <dt>Public voice notes</dt>
                    <dd>
                      {approvedVoice(row?.voice_notes)
                        .map(
                          (n) =>
                            `${n.title} (${n.start.toFixed(1)}–${n.end.toFixed(1)}s)`,
                        )
                        .join(', ') || 'None — recordings stay private'}
                    </dd>
                  </>
                )}
                <dt>Public category</dt>
                <dd>
                  <select
                    aria-label="Category to share"
                    value={publicCategory}
                    disabled={busy}
                    onChange={(e) => patchPlan({ category: e.target.value })}
                  >
                    <option value="Uncategorized">Exclude category</option>
                    {journalCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </dd>
                <dt>Public tags</dt>
                <dd>
                  <input
                    aria-label="Tags to share"
                    placeholder="No public tags"
                    maxLength={154}
                    disabled={busy}
                    value={publicTags}
                    onChange={(e) => patchPlan({ tags: e.target.value })}
                  />
                </dd>
                <dt>Public identity</dt>
                <dd>
                  {profile?.visible ? (
                    <label className="row">
                      <input
                        type="checkbox"
                        checked={byline}
                        disabled={busy}
                        onChange={(e) =>
                          patchPlan({ byline: e.target.checked })
                        }
                      />
                      Attribute this story to @{profile.username}
                    </label>
                  ) : (
                    'Anonymous'
                  )}
                </dd>
                {persistentMusicEnabled && (
                  <>
                    <dt>Public music</dt>
                    <dd>
                      {draft.music?.provider === 'youtube' && (
                        <label className="row">
                          <input
                            type="checkbox"
                            checked={draft.music.share}
                            disabled={busy}
                            onChange={(event) =>
                              patch({
                                music: {
                                  ...draft.music!,
                                  share: event.target.checked,
                                },
                              })
                            }
                          />
                          Include this music
                        </label>
                      )}
                      {row?.music?.provider === 'youtube' &&
                      publicMusic(row.music) ? (
                        <a
                          href={musicUrl(publicMusic(row?.music)!)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Approved YouTube video
                        </a>
                      ) : (
                        'None'
                      )}
                    </dd>
                  </>
                )}
              </dl>

              <h3>{row?.title}</h3>
              <PageCover
                privateMedia
                document={row?.writing_document}
                preset={row?.cover_preset}
              />
              {documentAssetIds(row?.writing_document).length > 0 && (
                <label className="row">
                  <input
                    type="checkbox"
                    checked={approvePhotos}
                    onChange={(e) =>
                      setApprovedPhotosKey(
                        e.target.checked ? photoApprovalKey : null,
                      )
                    }
                  />
                  I approve publishing these photos and their alt text. Public
                  links may remain valid for up to 60 seconds after
                  unpublishing; downloaded copies cannot be recalled.
                </label>
              )}
              {richEditorEnabled && (
                <>
                  <p>
                    Page icon:{' '}
                    {entryIcon(row?.writing_document, row?.page_icon) ?? 'None'}
                    {' · '}
                    {row?.writing_document?.page
                      ? row.writing_document.page.cover === 'upload'
                        ? 'Custom photo cover'
                        : 'Gallery cover'
                      : row?.cover_preset && row.cover_preset !== 'none'
                        ? 'Color cover'
                        : 'No cover'}
                  </p>
                  <p>
                    {row?.body.slice(0, 180)}
                    {(row?.body.length ?? 0) > 180 ? '…' : ''}
                  </p>
                  <details>
                    <summary>Review complete writing and inline photos</summary>
                    <RichRead
                      privateMedia
                      document={row?.writing_document}
                      fallback={row?.body ?? ''}
                    />
                  </details>
                </>
              )}
              {!richEditorEnabled && (
                <p
                  style={{
                    whiteSpace: 'pre-wrap',
                    maxHeight: '40vh',
                    overflow: 'auto',
                  }}
                >
                  {row?.body}
                </p>
              )}
            </article>
          )}
          {invalidPublicTags && confirmation === 'publish' && (
            <p role="alert">
              Choose up to five public tags, each under 31 characters.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="row confirmation-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </button>
            <button
              className="button"
              disabled={
                busy ||
                (confirmation === 'publish' &&
                  (dirty ||
                    (documentAssetIds(row?.writing_document).length > 0 &&
                      !approvePhotos))) ||
                (confirmation === 'publish' && invalidPublicTags)
              }
              onClick={async () => {
                const kind = confirmation
                if (
                  kind === 'publish' &&
                  documentAssetIds(row?.writing_document).length > 0 &&
                  !approvePhotos
                )
                  return
                const done = await state.action(
                  kind,
                  communityEnabled && kind === 'publish'
                    ? {
                        public_username:
                          byline && profile?.visible ? profile.username : null,
                        public_category: publicCategory,
                        public_tags: publicationTags(publicTags),
                      }
                    : undefined,
                )
                if (done) setConfirmation(null)
                if (done && kind === 'delete')
                  navigate('/app', { replace: true })
              }}
            >
              {confirmation === 'publish'
                ? busy
                  ? 'Publishing…'
                  : dirty
                    ? 'Saving choices…'
                    : 'Publish now'
                : `Confirm ${confirmation}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
