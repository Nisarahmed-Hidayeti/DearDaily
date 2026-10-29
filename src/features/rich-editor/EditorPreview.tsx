import { PageAppearance } from './PageAppearance'
import { PageCover } from './PageCover'
import { useWritingFocus } from './useWritingFocus'
import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { themes } from '../theme/themes'
import type { ThemeId } from '../theme/themes'
import { RichWriter } from './RichWriter'
import { documentFromText } from './document'
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
  const { focus, setFocus } = useWritingFocus()
  const [font, setFont] = useState('sans')
  const preview = useOutletContext<{
    setPreviewTheme?: (theme: ThemeId) => void
  } | null>()
  const [theme, setTheme] = useState<ThemeId>('midnight-purple')
  const [width, setWidth] = useState('standard')
  const setPreviewTheme = preview?.setPreviewTheme
  useEffect(() => {
    setPreviewTheme?.(theme)
  }, [theme, setPreviewTheme])
  return (
    <div
      className={`page editor-lab notion-editor ${focus ? 'writer-focus' : ''}`}
      data-theme={theme}
      data-width={width}
      data-font={font}
    >
      <button
        className="focus-exit"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setFocus(false)}
      >
        Exit Focus Mode <kbd>Esc</kbd>
      </button>
      <p className="eyebrow">DearDaily / Editor workshop</p>
      <p className="auth-notice" role="status">
        Synthetic preview · writing stays in this tab. Cloud saving, uploaded
        photos and public publishing are not connected yet. Export before
        leaving.
      </p>
      <details>
        <summary>Page options</summary>
        <div className="writer-preferences">
          <label>
            Visual preview theme
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeId)}
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button secondary"
            aria-pressed={focus}
            onMouseDown={(e) => e.preventDefault()}
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
      </details>
      <section className="writer-document">
        <PageCover document={document} preset={cover} />
        <PageAppearance
          document={document}
          preset={cover}
          icon={icon}
          onApply={(style) => {
            setDocument(style.document)
            setCover(style.preset ?? 'none')
            setIcon(style.icon ?? '')
          }}
        />
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
