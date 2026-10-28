import { themes } from '../theme/themes'
import type { ThemeId } from '../theme/themes'
import { useState } from 'react'
import { StoryCard } from './StoryCard'
import { PageHeading, Modal } from '../../components/Shared'
/** Development-only visual fixture. Never part of real Explore or security evidence. */
export default function CommunityPreview() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeId>('midnight-purple')
  return (
    <div
      className="page"
      data-theme={theme}
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
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
      <p className="auth-notice">
        Development visual fixture · All names and stories below are fictional ·
        No backend writes
      </p>
      <PageHeading
        eyebrow="Public storytelling / Layout preview"
        title="Every day has a story."
      />
      <section className="profile-masthead panel">
        <span className="profile-avatar">❧</span>
        <h2>The quiet observer</h2>
        <p>@fictional_writer</p>
        <p className="profile-bio">
          Small memories, carefully shared. A fictional public biography for
          checking typography, spacing and all four themes.
        </p>
        <p className="muted">3 published stories</p>
      </section>
      <form
        className="explore-controls panel"
        onSubmit={(e) => e.preventDefault()}
      >
        <label>
          Search story titles
          <input type="search" placeholder="Find a shared moment" />
        </label>
        <label>
          Category
          <select>
            <option>All categories</option>
            <option>Growth</option>
          </select>
        </label>
        <label>
          Sort
          <select>
            <option>Newest first</option>
            <option>Oldest first</option>
          </select>
        </label>
      </form>
      <div className="story-grid">
        {[
          'A little room for wonder',
          'What the morning left behind',
          'A long title with a gentle ending',
        ].map((title, i) => (
          <StoryCard
            key={title}
            story={{
              id: 'fixture-' + i,
              title,
              body: 'Today I took the slower path home. The ordinary world had something to say, and for once I gave myself time to listen.',
              published_at: '2026-10-28T12:00:00Z',
              public_username: i ? 'fictional_writer' : null,
              public_category: 'Growth',
              public_tags: ['small-moments', 'reflection'],
            }}
          />
        ))}
      </div>
      <section className="detail">
        <h1>A little room for wonder</h1>
        <article>
          <p>
            A deliberately fictional paragraph. The reading experience should
            feel calm and spacious on a small phone as well as a wide screen.
          </p>
        </article>
        <button className="button secondary" onClick={() => setOpen(true)}>
          Preview report dialog
        </button>
      </section>
      {open && (
        <Modal
          title="Report dialog / Visual fixture"
          onClose={() => setOpen(false)}
        >
          <label>
            Reason
            <select>
              <option>Spam</option>
              <option>Personal information exposure</option>
            </select>
          </label>
          <label>
            Additional context
            <textarea maxLength={1000} />
          </label>
          <button className="button" onClick={() => setOpen(false)}>
            Close without submitting
          </button>
        </Modal>
      )}
    </div>
  )
}
