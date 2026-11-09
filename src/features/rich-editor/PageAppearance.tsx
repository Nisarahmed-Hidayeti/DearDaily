import { EmojiPicker } from './EmojiPicker'
import { compatibleLegacyIcon, entryIcon } from './emojis'
import { useState } from 'react'
import { Modal } from '../../components/Shared'
import {
  documentFromText,
  validateDocument,
  type WritingDocument,
  type CoverPreset,
} from './document'
import { photographicCovers, coverThumbnail, type PhotoCoverId } from './covers'
import { PageCover } from './PageCover'
export function PageAppearance({
  document,
  preset,
  icon,
  onApply,
  disabled = false,
  onUpload,
  showCover = false,
}: {
  document?: WritingDocument | null
  preset?: CoverPreset | null
  icon?: string | null
  onApply: (style: {
    document: WritingDocument
    preset: CoverPreset | null
    icon: string | null
  }) => void
  disabled?: boolean
  onUpload?: (file: File) => Promise<string>
  showCover?: boolean
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState<WritingDocument>(
      document ?? documentFromText(''),
    ),
    [cover, setCover] = useState<CoverPreset | null>(preset ?? null),
    [emoji, setEmoji] = useState(entryIcon(document, icon) ?? ''),
    [collection, setCollection] = useState('The Met · Hudson River School'),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(''),
    [section, setSection] = useState<'cover' | 'icon'>('cover')
  let unsupported = false
  try {
    if (document) validateDocument(document)
  } catch {
    unsupported = true
  }
  const hasAppearance = !!(
    entryIcon(document, icon) ||
    document?.page ||
    (preset && preset !== 'none')
  )
  const choosePhoto = (id: PhotoCoverId) => {
    setDraft({ ...draft, page: { cover: id, position: 50 } })
    setCover(null)
  }
  const chooseColor = (id: CoverPreset) => {
    const next = { ...draft }
    delete next.page
    setDraft(next)
    setCover(id)
  }
  const openAppearance = (part: 'cover' | 'icon' = 'cover') => {
    setSection(part)
    setDraft(document ?? documentFromText(''))
    setCover(preset ?? null)
    setEmoji(entryIcon(document, icon) ?? '')
    setOpen(true)
  }
  return (
    <>
      {showCover && (document?.page || (preset && preset !== 'none')) && (
        <button
          type="button"
          className="editor-cover-action"
          aria-label="Change or remove cover"
          title="Change, remove or reposition cover"
          disabled={disabled || unsupported}
          onClick={() => openAppearance('cover')}
        >
          <PageCover privateMedia document={document} preset={preset} />
        </button>
      )}
      <div className="page-appearance-controls">
        <button
          type="button"
          className={hasAppearance ? 'page-style-icon' : undefined}
          title="Cover & page icon"
          aria-label={`${entryIcon(document, icon) || '＋'} Cover & page icon`}
          disabled={disabled || unsupported}
          onClick={() =>
            openAppearance(entryIcon(document, icon) ? 'icon' : 'cover')
          }
        >
          <span>
            {entryIcon(document, icon) || (hasAppearance ? '✧' : '＋')}
          </span>
          <span className={hasAppearance ? 'sr-only' : undefined}>
            {' '}
            Cover & page icon
          </span>
        </button>
        {open && (
          <Modal
            title="Make this page yours"
            className="page-style-dialog"
            onClose={() => setOpen(false)}
          >
            <div
              className="page-style-tabs"
              role="group"
              aria-label="Page appearance section"
            >
              <button
                type="button"
                aria-pressed={section === 'cover'}
                onClick={() => setSection('cover')}
              >
                Cover
              </button>
              <button
                type="button"
                aria-pressed={section === 'icon'}
                onClick={() => setSection('icon')}
              >
                Page icon
              </button>
            </div>
            <div hidden={section !== 'cover'}>
              <div className="appearance-cover-preview">
                <PageCover privateMedia document={draft} preset={cover} />
              </div>
              <label className="cover-upload">
                Upload cover from computer
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!onUpload || uploading}
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    e.currentTarget.value = ''
                    if (!f || !onUpload) return
                    setUploading(true)
                    setError('')
                    try {
                      const id = await onUpload(f)
                      setDraft((current) => ({
                        ...current,
                        page: { cover: 'upload', assetId: id, position: 50 },
                      }))
                      setCover(null)
                    } catch (failure) {
                      setError(
                        (failure instanceof Error
                          ? failure.message
                          : 'Cover upload failed.') +
                          ' Your previous cover is unchanged.',
                      )
                    } finally {
                      setUploading(false)
                    }
                  }}
                />
              </label>
              {uploading && <p role="status">Preparing private cover…</p>}
              {error && <p role="alert">{error}</p>}
              <fieldset>
                <legend>Curated photographs</legend>
                <label>
                  Cover collection
                  <select
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                  >
                    <option value="">All collections</option>
                    {[
                      ...new Set(photographicCovers.map((c) => c.collection)),
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                {[...new Set(photographicCovers.map((c) => c.collection))]
                  .filter((group) => !collection || group === collection)
                  .map((group) => (
                    <section
                      className="cover-collection"
                      key={group}
                      aria-label={group}
                    >
                      <h4>{group}</h4>
                      <div className="cover-gallery">
                        {photographicCovers
                          .filter((c) => c.collection === group)
                          .map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              disabled={uploading}
                              title={`${c.name} · ${c.credit}`}
                              aria-label={c.name}
                              aria-pressed={draft.page?.cover === c.id}
                              onClick={() => choosePhoto(c.id)}
                            >
                              <img
                                src={coverThumbnail(c)}
                                alt=""
                                loading="lazy"
                              />
                              <span className="sr-only">{c.name}</span>
                            </button>
                          ))}
                      </div>
                    </section>
                  ))}
              </fieldset>
              <button
                type="button"
                className="text-button"
                disabled={uploading}
                onClick={() => chooseColor('none')}
              >
                Remove cover
              </button>
              {draft.page && (
                <label className="cover-position">
                  Reposition cover
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={draft.page.position}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        page: {
                          ...draft.page!,
                          position: Number(e.target.value),
                        },
                      })
                    }
                  />
                  <details>
                    <summary>Mobile crop</summary>
                    <div className="cover-mobile-crop">
                      <PageCover privateMedia document={draft} />
                    </div>
                  </details>
                </label>
              )}
            </div>
            <div hidden={section !== 'icon'}>
              <EmojiPicker value={emoji} onChange={setEmoji} />
            </div>
            <div className="appearance-actions">
              <button
                className="button"
                disabled={uploading}
                onClick={() => {
                  const next = {
                    ...draft,
                    content: document?.content ?? draft.content,
                  }
                  if (emoji) next.icon = emoji
                  else delete next.icon
                  onApply({
                    document: validateDocument(next),
                    preset: cover,
                    icon: compatibleLegacyIcon(emoji),
                  })
                  setOpen(false)
                }}
              >
                Apply page style
              </button>
              <button
                className="button secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}
      </div>
    </>
  )
}
