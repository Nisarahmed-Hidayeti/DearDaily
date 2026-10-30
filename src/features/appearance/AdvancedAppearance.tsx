import { useTheme } from '../theme/ThemeProvider'
import { useState } from 'react'
import { useAppearance } from './AppearanceProvider'
import {
  appearanceTokens,
  themeBackgrounds,
  themeAccents,
  defaultAppearance,
  type Appearance,
} from './appearance'
import type { CSSProperties } from 'react'
export function AdvancedAppearance() {
  const { theme } = useTheme()
  const { appearance, status, save, retry } = useAppearance(),
    [draftChoice, setDraft] = useState<{
      value: Appearance
      base: Appearance
    } | null>(null),
    [message, setMessage] = useState('')
  const draft = draftChoice?.value ?? appearance
  const change = (p: Partial<Appearance>) =>
    setDraft((d) => ({
      value: { ...(d?.value ?? appearance), ...p },
      base: d?.base ?? appearance,
    }))
  return (
    <section
      className="advanced-appearance"
      aria-labelledby="advanced-appearance-title"
    >
      <div>
        <p className="eyebrow">The details are yours</p>
        <h2 id="advanced-appearance-title">A space with your handwriting.</h2>
        <p>Preview a few considered choices. Apply when it feels right.</p>
      </div>
      <div className="appearance-editor-grid">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const confirmed = await save(draft, draftChoice?.base ?? appearance)
            setMessage(
              confirmed
                ? 'Appearance saved.'
                : 'Appearance not confirmed. Reload your saved appearance before trying again.',
            )
            if (confirmed) setDraft(null)
          }}
        >
          <div className="row">
            <label>
              Accent color
              <input
                type="color"
                value={draft.accent ?? themeAccents[theme]}
                onChange={(e) => change({ accent: e.target.value })}
              />
            </label>
            <label>
              Background color
              <input
                type="color"
                value={draft.background ?? themeBackgrounds[theme]}
                onChange={(e) => change({ background: e.target.value })}
              />
            </label>
          </div>
          <label>
            Surface
            <select
              value={draft.surface}
              onChange={(e) =>
                change({ surface: e.target.value as Appearance['surface'] })
              }
            >
              <option value="default">Balanced</option>
              <option value="soft">Soft</option>
              <option value="flat">Quiet</option>
            </select>
          </label>
          <label>
            Writing font
            <select
              value={draft.font}
              onChange={(e) =>
                change({ font: e.target.value as Appearance['font'] })
              }
            >
              <option value="sans">Sans serif</option>
              <option value="serif">Editorial serif</option>
            </select>
          </label>
          <label>
            Reading text size
            <select
              value={draft.size}
              onChange={(e) =>
                change({ size: Number(e.target.value) as Appearance['size'] })
              }
            >
              {[16, 18, 20].map((n) => (
                <option key={n} value={n}>
                  {n}px
                </option>
              ))}
            </select>
          </label>
          <label>
            Writing width
            <select
              value={draft.width}
              onChange={(e) =>
                change({ width: e.target.value as Appearance['width'] })
              }
            >
              {['narrow', 'standard', 'wide'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Spacing
            <select
              value={draft.spacing}
              onChange={(e) =>
                change({ spacing: e.target.value as Appearance['spacing'] })
              }
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label>
            Background texture
            <select
              value={draft.texture}
              onChange={(e) =>
                change({ texture: e.target.value as Appearance['texture'] })
              }
            >
              <option value="none">None</option>
              <option value="paper">Subtle paper</option>
            </select>
          </label>
          {status === 'blocked' && (
            <p className="auth-notice">
              Account style synchronization requires the reviewed Renaissance
              settings migration. Preview is available; cloud changes stay
              disabled.
            </p>
          )}
          <div className="row">
            <button
              className="button"
              disabled={['blocked', 'loading', 'saving', 'error'].includes(
                status,
              )}
            >
              Apply appearance
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setDraft({
                  value: defaultAppearance,
                  base: draftChoice?.base ?? appearance,
                })
              }
            >
              Reset preview
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setDraft(null)
                setMessage('')
              }}
            >
              Use saved appearance
            </button>
          </div>
          {status === 'error' && (
            <button type="button" onClick={retry}>
              Reload saved appearance
            </button>
          )}
          {message && <p role="status">{message}</p>}
        </form>
        <div
          className="appearance-live-preview"
          style={
            {
              ...appearanceTokens(draft, themeBackgrounds[theme]),
              fontFamily:
                draft.font === 'serif' ? 'var(--serif)' : 'Inter,sans-serif',
            } as CSSProperties
          }
        >
          <p className="eyebrow">Live preview / not saved yet</p>
          <span>✦</span>
          <h3>A moment, kept.</h3>
          <p
            style={{
              fontSize: draft.size,
              lineHeight: draft.spacing === 'compact' ? 1.55 : 1.8,
            }}
          >
            The light moved across the table. Nothing extraordinary happened. I
            wanted to remember it anyway.
          </p>
          <button type="button" className="button">
            Your accent
          </button>
          <small>Text and button colors adapt for readable contrast.</small>
        </div>
      </div>
    </section>
  )
}
