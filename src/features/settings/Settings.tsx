import {
  Check,
  Palette,
  LockKeyhole,
  ArrowUpRight,
  BookOpen,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeading } from '../../components/Shared'
import { themes } from '../theme/themes'
import { useTheme } from '../theme/ThemeProvider'
import './settings.css'

export default function Settings() {
  const { theme, selectTheme, storageAvailable } = useTheme()
  const current = themes.find((preset) => preset.id === theme)!
  return (
    <div className="page settings-page">
      <PageHeading
        eyebrow="Your space / Settings"
        title="Make yourself at home."
      />
      <p className="page-subtitle">
        A familiar space, in the colors that feel like you.
      </p>
      <section
        className="appearance-section"
        aria-labelledby="appearance-title"
      >
        <div className="appearance-heading">
          <span className="settings-icon">
            <Palette size={22} />
          </span>
          <div>
            <h2 id="appearance-title">The mood of your space</h2>
            <p>One palette for every page. Choose your favorite.</p>
          </div>
          <span className="badge">4 thoughtfully chosen palettes</span>
        </div>
        <fieldset className="theme-options">
          <legend className="sr-only">Website theme</legend>
          {themes.map((preset) => (
            <label className="theme-option" key={preset.id}>
              <input
                type="radio"
                name="website-theme"
                value={preset.id}
                checked={theme === preset.id}
                onChange={() => selectTheme(preset.id)}
                aria-label={preset.name}
              />
              <span className="theme-option-content">
                <span
                  className="theme-preview"
                  data-theme={preset.id}
                  aria-hidden="true"
                >
                  <span className="preview-sidebar">
                    <BookOpen size={17} />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="preview-page">
                    <span className="preview-kicker">A moment for you</span>
                    <span className="preview-title">
                      A new day.
                      <br />
                      <em>A new page.</em>
                    </span>
                    <span className="preview-line" />
                    <span className="preview-line short" />
                    <span className="preview-bottom">
                      <span className="preview-button">
                        Start writing <ArrowUpRight size={12} />
                      </span>
                      <span className="preview-swatches">
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                  </span>
                </span>
                <span className="theme-option-caption">
                  <span>
                    <span className="theme-name">{preset.name}</span>
                    <span className="theme-mood">{preset.mood}</span>
                  </span>
                  <span className="theme-check" aria-hidden="true">
                    {theme === preset.id && <Check size={16} />}
                  </span>
                </span>
                <span className="theme-description">{preset.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="theme-feedback" role="status">
          <Check size={16} />
          <p>
            <strong>{current.name}</strong> is active.{' '}
            {storageAvailable
              ? 'Theme changes are remembered on this browser.'
              : 'Browser storage is unavailable. Your choice lasts for this session only.'}
          </p>
        </div>
      </section>
      <section className="panel settings-privacy">
        <LockKeyhole size={23} />
        <div>
          <h2>Your preference stays simple.</h2>
          <p>
            Only your theme choice is saved on this device. Journal drafts
            remain temporary and are never stored in your browser. Account
            syncing is coming in a later phase.
          </p>
        </div>
        <Link to="/" className="text-link">
          See your theme on the homepage <ArrowUpRight size={16} />
        </Link>
      </section>
    </div>
  )
}
