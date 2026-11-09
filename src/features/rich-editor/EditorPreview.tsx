import { studioPolishEnabled, writingFonts } from './studioPolish'
import { type PrivateMusic } from '../music/music'
import { VoiceNotes } from '../audio/VoiceNotes'
import { type VoiceNote } from '../audio/audio'
import { WritingMusic } from '../music/WritingMusic'
import { PageAppearance } from './PageAppearance'
import { useWritingFocus } from './useWritingFocus'
import { useState, useEffect, useRef } from 'react'
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
  const [music, setMusic] = useState<PrivateMusic | null>(null)
  const [notes, setNotes] = useState<VoiceNote[]>([])
  const [sources, setSources] = useState<Record<string, string>>({})
  const objectUrls = useRef<string[]>([])
  useEffect(
    () => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
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
            <select value={width} onChange={(e) => setWidth(e.target.value)}>
              <option value="narrow">Narrow</option>
              <option value="standard">Standard</option>
              <option value="wide">Wide</option>
            </select>
          </label>
        </div>
      </details>
      <section className="writer-document">
        <PageAppearance
          showCover
          document={document}
          preset={cover}
          icon={icon}
          onApply={(style) => {
            setDocument(style.document)
            setCover(style.preset ?? 'none')
            setIcon(style.icon ?? '')
          }}
        />
        <WritingMusic value={music} onChange={setMusic} />
        <div className="writer-sheet">
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
          <VoiceNotes
            notes={notes}
            onChange={setNotes}
            localSources={sources}
            onUpload={async (blob) => {
              const id = crypto.randomUUID(),
                url = URL.createObjectURL(blob)
              objectUrls.current.push(url)
              setSources((s) => ({ ...s, [id]: url }))
              return id
            }}
          />
        </div>
      </section>
    </div>
  )
}
