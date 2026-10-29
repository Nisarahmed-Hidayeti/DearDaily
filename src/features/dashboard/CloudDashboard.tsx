import { PageCover } from '../rich-editor/PageCover'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Plus } from 'lucide-react'
import { LoadingState, PageHeading } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import { listEntries } from '../journal/journalApi'
import type { JournalEntry } from '../journal/journalApi'
import { journalStats } from '../journal/journalStats'
import ActivityHeatmap from './ActivityHeatmap'
export default function CloudDashboard({
  library = false,
}: {
  library?: boolean
}) {
  const { client, session } = useAuth()
  const [rows, setRows] = useState<JournalEntry[]>([])
  const [status, setStatus] = useState('loading')
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState('')
  const [mood, setMood] = useState('All moods')
  const [date, setDate] = useState('')
  const [view, setView] = useState<'list' | 'gallery'>('list')
  useEffect(() => {
    if (!client || !session) return
    let active = true
    let sequence = 0
    const load = async () => {
      const request = ++sequence
      try {
        const result = await listEntries(client, session.user.id)
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
  const stats = journalStats(rows)
  const filtered = rows.filter(
    (r) =>
      (!search ||
        [r.title, r.body, ...r.tags]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (mood === 'All moods' || r.mood === mood) &&
      (!date || r.entry_date === date),
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
      {!library && (
        <section className="daily-invitation">
          <span className="eyebrow">
            {new Intl.DateTimeFormat(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(new Date())}
          </span>
          <h2>Keep a little of today.</h2>
          <Link className="text-link" to="/app/write">
            Open a fresh page <span aria-hidden="true">↗</span>
          </Link>
        </section>
      )}
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
          {!library && (
            <>
              <div className="stats">
                {[
                  [rows.length, 'Total entries'],
                  [stats.words, 'Words written'],
                  [stats.streak, 'Day writing streak'],
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
                  onClick={() => setView('list')}
                >
                  List
                </button>
                <button
                  aria-pressed={view === 'gallery'}
                  onClick={() => setView('gallery')}
                >
                  Gallery
                </button>
              </div>
            </div>
            <div className="filters">
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
                  {['All moods', 'Calm', 'Happy', 'Reflective', 'Low'].map(
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
              {filtered.map((r) => (
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
                          document={r.writing_document}
                          preset={r.cover_preset}
                        />
                      ) : (
                        <span>{r.page_icon || '✧'}</span>
                      )}
                    </div>
                  )}
                  <div>
                    <span className="tiny muted">
                      {r.entry_date} · {r.status}
                    </span>
                    <h3>
                      {r.page_icon && <span>{r.page_icon} </span>}
                      {r.title || 'Untitled entry'}
                    </h3>
                    <p>{r.body.slice(0, 150)}</p>
                    <span className="visibility">Private source entry</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
          <p className="tiny muted">
            Streaks count distinct saved entry dates, through today or
            yesterday, using the dates you choose. Drafts do not count.
          </p>
        </>
      )}
    </div>
  )
}
