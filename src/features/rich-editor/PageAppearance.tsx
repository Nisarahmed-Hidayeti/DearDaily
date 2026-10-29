import { useState } from 'react'
import { Modal } from '../../components/Shared'
import {
  coverPresets,
  pageIcons,
  documentFromText,
  validateDocument,
  type WritingDocument,
  type CoverPreset,
} from './document'
import { photographicCovers, type PhotoCoverId } from './covers'
import { PageCover } from './PageCover'
const iconNames = [
  'leaf nature forest',
  'sun sunshine morning',
  'moon night sky',
  'sparkles stars magic',
  'book reading journal',
  'lotus flower calm',
  'wave ocean sea',
  'autumn leaves fall',
  'thought cloud ideas',
  'orange heart love',
  'plane travel journey',
  'sunflower summer garden',
]
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
    [emoji, setEmoji] = useState(icon ?? ''),
    [query, setQuery] = useState(''),
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
          setEmoji(icon ?? '')
          setOpen(true)
        }}
      >
        {icon || '＋'} Cover & page icon
      </button>
      {open && (
        <Modal title="Make this page yours" onClose={() => setOpen(false)}>
          <div className="appearance-cover-preview">
            <PageCover privateMedia document={draft} preset={cover} />
          </div>
          <label className="cover-upload">
            Upload a private cover
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
                  setDraft({
                    ...draft,
                    page: { cover: 'upload', assetId: id, position: 50 },
                  })
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
              Personal uploads require a saved entry and approved private
              Storage setup.
            </p>
          )}
          <fieldset>
            <legend>Curated photographs</legend>
            <div className="cover-gallery">
              {photographicCovers.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  aria-pressed={draft.page?.cover === c.id}
                  onClick={() => choosePhoto(c.id)}
                >
                  <img src={c.src} alt="" loading="lazy" />
                  <span>{c.name}</span>
                  <small>{c.collection}</small>
                </button>
              ))}
            </div>
            <p className="photo-credit">
              Photos by{' '}
              {photographicCovers.map((c, i) => (
                <span key={c.id}>
                  {i ? ', ' : ''}
                  <a href={c.source} target="_blank" rel="noopener noreferrer">
                    {c.credit}
                  </a>
                </span>
              ))}{' '}
              · Pexels License
            </p>
          </fieldset>
          <fieldset>
            <legend>Color studies</legend>
            <div className="cover-colors">
              {coverPresets.map((c) => (
                <button
                  type="button"
                  key={c}
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
          <fieldset>
            <legend>Page icon</legend>
            <input
              type="search"
              aria-label="Search page icons"
              placeholder="Try nature, reading, travel…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="emoji-grid">
              {pageIcons
                .filter(
                  (p, i) =>
                    !query ||
                    (p + ' ' + iconNames[i]).includes(query.toLowerCase()),
                )
                .map((p) => (
                  <button
                    type="button"
                    key={p}
                    aria-label={`Use ${p}`}
                    aria-pressed={emoji === p}
                    onClick={() => setEmoji(p)}
                  >
                    {p}
                  </button>
                ))}
              <button type="button" onClick={() => setEmoji('')}>
                Remove icon
              </button>
            </div>
          </fieldset>
          <div className="appearance-actions">
            <button
              className="button"
              onClick={() => {
                onApply({
                  document: validateDocument({
                    ...draft,
                    content: document?.content ?? draft.content,
                  }),
                  preset: cover,
                  icon: emoji || null,
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
