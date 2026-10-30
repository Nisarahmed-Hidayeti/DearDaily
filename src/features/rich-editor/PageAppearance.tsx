import { EmojiPicker } from './EmojiPicker'
import { compatibleLegacyIcon, entryIcon } from './emojis'
import { useState } from 'react'
import { Modal } from '../../components/Shared'
import {
  coverPresets,
  documentFromText,
  validateDocument,
  type WritingDocument,
  type CoverPreset,
} from './document'
import { photographicCovers, type PhotoCoverId } from './covers'
import { PageCover } from './PageCover'
export function PageAppearance({
  document,
  preset,
  icon,
  onApply,
  disabled = false,
  onUpload,
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
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState<WritingDocument>(
      document ?? documentFromText(''),
    ),
    [cover, setCover] = useState<CoverPreset | null>(preset ?? null),
    [emoji, setEmoji] = useState(entryIcon(document, icon) ?? ''),
    [collection, setCollection] = useState(''),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState('')
  let unsupported = false
  try {
    if (document) validateDocument(document)
  } catch {
    unsupported = true
  }
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
  return (
    <div className="page-appearance-controls">
      <button
        type="button"
        disabled={disabled || unsupported}
        onClick={() => {
          setDraft(document ?? documentFromText(''))
          setCover(preset ?? null)
          setEmoji(entryIcon(document, icon) ?? '')
          setOpen(true)
        }}
      >
        {entryIcon(document, icon) || '＋'} Cover & page icon
      </button>
      {open && (
        <Modal title="Make this page yours" onClose={() => setOpen(false)}>
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
                } catch {
                  setError(
                    'Cover upload failed. Your previous cover is unchanged.',
                  )
                } finally {
                  setUploading(false)
                }
              }}
            />
          </label>
          {uploading && <p role="status">Preparing private cover…</p>}
          {error && <p role="alert">{error}</p>}
          {!onUpload && (
            <p className="tiny muted">
              Upload your own photos in the signed-in cloud editor. This preview
              does not upload personal files.
            </p>
          )}
          <fieldset>
            <legend>Curated photographs</legend>
            <label>
              Cover collection
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
              >
                <option value="">All collections</option>
                {[...new Set(photographicCovers.map((c) => c.collection))].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </label>
            <div className="cover-gallery">
              {photographicCovers
                .filter((c) => !collection || c.collection === collection)
                .map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    disabled={uploading}
                    aria-pressed={draft.page?.cover === c.id}
                    onClick={() => choosePhoto(c.id)}
                  >
                    <img src={c.src} alt="" loading="lazy" />
                    <span>{c.name}</span>
                    <small>{c.collection}</small>
                  </button>
                ))}
            </div>
            <details className="photo-credit">
              <summary>Photograph credits &amp; license</summary>
              <p>
                Photos by{' '}
                {photographicCovers.map((c, i) => (
                  <span key={c.id}>
                    {i ? ', ' : ''}
                    <a
                      href={c.source}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {c.credit}
                    </a>
                  </span>
                ))}{' '}
                ·{' '}
                <a
                  href="https://www.pexels.com/license/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pexels License
                </a>
              </p>
            </details>
          </fieldset>
          <fieldset>
            <legend>Color studies</legend>
            <div className="cover-colors">
              {coverPresets.map((c) => (
                <button
                  type="button"
                  key={c}
                  disabled={uploading}
                  aria-pressed={!draft.page && cover === c}
                  onClick={() => chooseColor(c)}
                >
                  {c === 'none' ? 'No cover' : c}
                </button>
              ))}
            </div>
          </fieldset>
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
                    page: { ...draft.page!, position: Number(e.target.value) },
                  })
                }
              />
              <span>
                Focal position {draft.page.position}% · wide and mobile crops
                use this point.
              </span>
              <div className="cover-mobile-crop">
                <PageCover privateMedia document={draft} />
              </div>
            </label>
          )}
          <EmojiPicker value={emoji} onChange={setEmoji} />
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
            <button className="button secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
