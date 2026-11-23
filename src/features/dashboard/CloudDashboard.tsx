import { availableMoods } from '../journal/entryMetadata'
import { entryIcon } from '../rich-editor/emojis'
import { PageCover } from '../rich-editor/PageCover'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Plus } from 'lucide-react'
import { LoadingState, PageHeading } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import { entryTitle, listEntrySummaries } from '../journal/journalApi'
import type { EntrySummary } from '../journal/journalApi'
import { journalStats } from '../journal/journalStats'
import { listDeviceDrafts } from '../journal/localDrafts'
import ActivityHeatmap from './ActivityHeatmap'
export default function CloudDashboard({
  library = false,
}: {
  library?: boolean
}) {
  const { client, session } = useAuth()
  const [rows, setRows] = useState<EntrySummary[]>([])
  const [status, setStatus] = useState('loading')
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState('')
  const [mood, setMood] = useState('All moods')
  const [date, setDate] = useState('')
  const [deviceDrafts, setDeviceDrafts] = useState(() => listDeviceDrafts())
  const [order, setOrder] = useState('newest')
  const [visibleCount, setVisibleCount] = useState(24)
  const [view, setView] = useState<'list' | 'gallery'>(() => {
    try {
      return localStorage.getItem('deardaily.library-view') === 'list'
        ? 'list'
        : 'gallery'
    } catch {
      return 'gallery'
    }
  })
  useEffect(() => {
    if (!client || !session) return
    let active = true
    let sequence = 0
    const load = async () => {
      const request = ++sequence
      try {
        const result = await listEntrySummaries(client, session.user.id)
        if (active && request === sequence) {
          setRows(result)
          setStatus('ready')
        }
      } catch {
        if (active && request === sequence) setStatus('error')
      }
    }
    void load()
    window.addEventListener('focus', load)
    return () => {
      active = false
      window.removeEventListener('focus', load)
    }
  }, [client, session, refresh])
  useEffect(() => {
    const refreshLocal = () => setDeviceDrafts(listDeviceDrafts())
    window.addEventListener('focus', refreshLocal)
    return () => window.removeEventListener('focus', refreshLocal)
  }, [])
  const stats = journalStats(rows)
  const filtered = rows
    .filter(
      (r) =>
        (!search ||
          [r.title, r.body, ...r.tags]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (mood === 'All moods' || r.mood === mood) &&
        (!date || r.entry_date === date),
    )
    .sort((a, b) =>
      order === 'title'
        ? a.title.localeCompare(b.title)
        : (order === 'oldest' ? 1 : -1) *
          a.entry_date.localeCompare(b.entry_date),
    )
  return (
    <div className={`page dashboard ${library ? 'journal-library' : ''}`}>
      <PageHeading
        eyebrow="Your journal / Overview"
        title={library ? 'My Journal' : 'A new day. A new page.'}
      >
        <Link className="button" to="/app/write">
          <Plus size={17} />
          New Entry
        </Link>
      </PageHeading>
      {status === 'loading' && (
        <LoadingState>Loading your private entries…</LoadingState>
      )}
      {status === 'error' && (
        <div role="alert">
          <p>
            Could not refresh your entries. Previously loaded data may be out of
            date.
          </p>
          <button
            className="button secondary"
            onClick={() => setRefresh((n) => n + 1)}
          >
            Retry loading
          </button>
        </div>
      )}
      {status !== 'loading' && (
        <>
          {!!deviceDrafts.length && (
            <section className="panel recent device-drafts">
              <div className="row spread">
                <h2>Saved on this device</h2>
                <span className="badge">Private drafts</span>
              </div>
              {deviceDrafts.map((draft) => (
                <Link
                  to={`/app/write?deviceDraft=${encodeURIComponent(draft.id)}`}
                  className="entry-row"
                  key={draft.id}
                >
                  <div>
                    <span className="tiny muted">
                      Saved {new Date(draft.updated_at).toLocaleString()}
                    </span>
                    <h3>{entryTitle(draft.title, draft.entry_date)}</h3>
                    <p>
                      {draft.body.slice(0, 180) ||
                        'An empty page, ready when you are.'}
                    </p>
                    <span className="visibility">
                      Import this private draft into your account
                    </span>
                  </div>
                </Link>
              ))}
            </section>
          )}
          {!library && (
            <>
              <div className="stats">
                {[
                  [rows.length, 'Total entries'],
                  [stats.words, 'Words written'],
                ].map(([value, label]) => (
                  <article className="panel stat" key={label}>
                    <BookOpen />
                    <div>
                      <strong>{value}</strong>
                      <span>{label}</span>
                    </div>
                  </article>
                ))}
              </div>
              <ActivityHeatmap activity={stats.activity} real />
            </>
          )}
          <section className="panel recent">
            <div className="row spread">
              <h2>Your pages</h2>
              <div
                className="library-view-toggle"
                role="group"
                aria-label="Journal view"
              >
                <button
                  aria-pressed={view === 'list'}
                  onClick={() => {
                    setView('list')
                    try {
                      localStorage.setItem('deardaily.library-view', 'list')
                    } catch {
                      /* Storage unavailable. */
                    }
                  }}
                >
                  List
                </button>
                <button
                  aria-pressed={view === 'gallery'}
                  onClick={() => {
                    setView('gallery')
                    try {
                      localStorage.setItem('deardaily.library-view', 'gallery')
                    } catch {
                      /* Storage unavailable. */
                    }
                  }}
                >
                  Gallery
                </button>
              </div>
            </div>
            <div className="filters">
              <label>
                Sort
                <select
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="title">Title</option>
                </select>
              </label>
              <label>
                Search
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Title, words or tags"
                />
              </label>
              <label>
                Mood
                <select value={mood} onChange={(e) => setMood(e.target.value)}>
                  {['All moods', ...availableMoods.map((mood) => mood[0])].map(
                    (m) => (
                      <option key={m}>{m}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>
            {!filtered.length && (
              <div className="empty-state">
                <h3>
                  {rows.length
                    ? 'No matching pages.'
                    : 'Your first page is waiting.'}
                </h3>
                <Link to="/app/write">Write an entry</Link>
              </div>
            )}
            <div
              className={
                view === 'gallery' ? 'journal-gallery' : 'journal-list'
              }
            >
              {filtered.slice(0, visibleCount).map((r) => (
                <Link
                  to={`/app/write/${r.id}`}
                  className="entry-row"
                  key={r.id}
                >
                  {view === 'gallery' && (
                    <div className="library-cover">
                      {r.writing_document?.page ||
                      (r.cover_preset && r.cover_preset !== 'none') ? (
                        <PageCover
                          size="thumbnail"
                          privateMedia
                          document={r.writing_document}
                          preset={r.cover_preset}
                        />
                      ) : (
                        <span>
                          {entryIcon(r.writing_document, r.page_icon) || '✧'}
                        </span>
                      )}
                    </div>
                  )}
                  <div>
                    <span className="tiny muted">
                      {r.entry_date} · {r.status}
                    </span>
                    <h3>
                      {entryIcon(r.writing_document, r.page_icon) && (
                        <span>
                          {entryIcon(r.writing_document, r.page_icon)}{' '}
                        </span>
                      )}
                      {entryTitle(r.title, r.entry_date)}
                    </h3>
                    <p>{r.body.slice(0, 150)}</p>
                    <span className="visibility">Private source entry</span>
                  </div>
                </Link>
              ))}
            </div>
            {visibleCount < filtered.length && (
              <button
                className="button secondary"
                onClick={() => setVisibleCount((count) => count + 24)}
              >
                Show more entries
              </button>
            )}
          </section>
          <p className="tiny muted">
            Each checkmark is a day you wrote. Drafts do not count.
          </p>
        </>
      )}
    </div>
  )
}
