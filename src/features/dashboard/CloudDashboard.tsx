import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Plus } from 'lucide-react'
import { PageHeading, Scene } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import { listEntries } from '../journal/journalApi'
import type { JournalEntry } from '../journal/journalApi'
import { journalStats } from '../journal/journalStats'
import ActivityHeatmap from './ActivityHeatmap'
export default function CloudDashboard() {
  const { client, session } = useAuth()
  const [rows, setRows] = useState<JournalEntry[]>([])
  const [status, setStatus] = useState('loading')
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState('')
  const [mood, setMood] = useState('All moods')
  const [date, setDate] = useState('')
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
    <div className="page dashboard">
      <PageHeading
        eyebrow="Your journal / Overview"
        title="A new day. A new page."
      >
        <Link className="button" to="/app/write">
          <Plus size={17} />
          New Entry
        </Link>
      </PageHeading>
      <div className="dashboard-banner">
        <Scene />
        <div>
          <p className="eyebrow">A gentle reminder</p>
          <h2>Every day has a story.</h2>
          <Link className="text-link" to="/app/write">
            Take a moment to write
          </Link>
        </div>
      </div>
      {status === 'loading' && (
        <p role="status">Loading your private entries…</p>
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
          <section className="panel recent">
            <h2>Your pages</h2>
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
            {filtered.map((r) => (
              <Link to={`/app/write/${r.id}`} className="entry-row" key={r.id}>
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
