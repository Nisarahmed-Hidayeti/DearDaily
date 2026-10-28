import { useState } from 'react'
import { RichWriter } from './RichWriter'
import { coverPresets, documentFromText, pageIcons } from './document'
import type { CoverPreset } from './document'
export default function EditorPreview() {
  const [document, setDocument] = useState(() =>
    documentFromText(
      'A little space for today.\nWhat would you like to remember?',
    ),
  )
  const [title, setTitle] = useState('The art of noticing')
  const [icon, setIcon] = useState('🌿')
  const [cover, setCover] = useState<CoverPreset>('dawn')
  const [focus, setFocus] = useState(false)
  const [font, setFont] = useState('serif')
  const [width, setWidth] = useState('standard')
  return (
    <div
      className={`page editor-lab ${focus ? 'writer-focus' : ''}`}
      data-width={width}
      data-font={font}
    >
      <p className="eyebrow">DearDaily / Editor workshop</p>
      <p className="auth-notice" role="status">
        Synthetic preview · writing stays in this tab. Cloud saving, uploaded
        photos and public publishing are not connected yet. Export before
        leaving.
      </p>
      <div className="writer-preferences">
        <button
          className="button secondary"
          aria-pressed={focus}
          onClick={() => setFocus(!focus)}
        >
          {focus ? 'Leave focus mode' : 'Focus mode'}
        </button>
        <label>
          Writing font
          <select value={font} onChange={(e) => setFont(e.target.value)}>
            <option value="serif">Serif</option>
            <option value="sans">Sans serif</option>
          </select>
        </label>
        <label>
          Page width
          <select value={width} onChange={(e) => setWidth(e.target.value)}>
            <option value="narrow">Narrow</option>
            <option value="standard">Standard</option>
            <option value="wide">Wide</option>
          </select>
        </label>
      </div>
      <section className="writer-document">
        {cover !== 'none' && (
          <div
            className="writer-cover"
            data-cover={cover}
            role="img"
            aria-label={`${cover} preset cover`}
          />
        )}
        <details className="writer-customize">
          <summary>Personalize this page</summary>
          <fieldset>
            <legend>Cover palette</legend>
            {coverPresets.map((p) => (
              <button
                key={p}
                aria-pressed={cover === p}
                onClick={() => setCover(p)}
              >
                {p === 'none' ? 'Remove cover' : p}
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend>Page icon</legend>
            {pageIcons.map((p) => (
              <button
                key={p}
                aria-label={`Use ${p} as page icon`}
                aria-pressed={icon === p}
                onClick={() => setIcon(p)}
              >
                {p}
              </button>
            ))}
            <button onClick={() => setIcon('')}>Remove icon</button>
          </fieldset>
          <p>
            Custom photo covers and repositioning need the secure media stage.
          </p>
        </details>
        <div className="writer-sheet">
          {icon && (
            <div className="writer-icon" aria-label="Page icon">
              {icon}
            </div>
          )}
          <label className="sr-only" htmlFor="workshop-title">
            Entry title
          </label>
          <input
            id="workshop-title"
            className="title-input"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
          <RichWriter value={document} onChange={setDocument} />
        </div>
      </section>
    </div>
  )
}
