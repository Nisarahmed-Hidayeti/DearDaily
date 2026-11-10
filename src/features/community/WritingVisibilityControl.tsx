import { useState } from 'react'
import { Modal } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import type { PublicProfile } from './communityApi'
import { rhythmActivity } from './publicRhythm'
export default function WritingVisibilityControl({
  saved,
  initial,
}: {
  saved: boolean
  initial: PublicProfile
}) {
  const { client } = useAuth()
  const [streak, setStreak] = useState(initial.public_streak != null),
    [calendar, setCalendar] = useState(!!rhythmActivity(initial.public_rhythm)),
    [live, setLive] = useState(!!initial.public_activity_live),
    [pending, setPending] = useState<{
      streak: boolean
      calendar: boolean
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function apply(next: { streak: boolean; calendar: boolean }) {
    if (!client || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await client.rpc('set_public_writing_visibility', {
        show_streak: next.streak,
        show_calendar: next.calendar,
        zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      if (
        result.error ||
        !result.data ||
        (next.streak
          ? !Number.isInteger(result.data.public_streak) ||
            result.data.public_streak < 0
          : result.data.public_streak !== null) ||
        (next.calendar
          ? !rhythmActivity(result.data.public_rhythm)
          : result.data.public_rhythm !== null)
      )
        throw Error()
      setStreak(next.streak)
      setCalendar(next.calendar)
      setLive(true)
      setPending(null)
    } catch {
      setError('Could not save your sharing choice. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="writing-visibility">
      <p className="tiny muted">
        Shared rhythm stays up to date automatically.
      </p>
      <label className="row">
        <span>
          <strong>Writing streak</strong>
          <small>Show your current consecutive writing days.</small>
        </span>
        <input
          type="checkbox"
          checked={streak}
          disabled={!saved || busy}
          onChange={(e) => {
            const next = { streak: e.target.checked, calendar }
            if (e.target.checked || (!live && calendar)) setPending(next)
            else void apply(next)
          }}
        />
      </label>
      <label className="row">
        <span>
          <strong>Writing calendar</strong>
          <small>Show which days you wrote. Your words remain private.</small>
        </span>
        <input
          type="checkbox"
          checked={calendar}
          disabled={!saved || busy}
          onChange={(e) => {
            const next = { streak, calendar: e.target.checked }
            if (e.target.checked || (!live && streak)) setPending(next)
            else void apply(next)
          }}
        />
      </label>
      {!live && (streak || calendar) && (
        <button
          className="text-button"
          disabled={!saved || busy}
          onClick={() => setPending({ streak, calendar })}
        >
          Confirm updated sharing
        </button>
      )}
      {error && !pending && <p role="alert">{error}</p>}
      {pending && (
        <Modal
          title="Confirm rhythm sharing"
          onClose={() => {
            if (!busy) setPending(null)
          }}
        >
          <p>
            {pending.calendar
              ? 'Your writing dates will be visible on your public profile and update automatically as you write.'
              : 'Your current writing-streak count will be visible on your public profile and update automatically.'}{' '}
            Your writing, moods and entry counts stay private. You can hide
            these details at any time.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="row">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Cancel
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void apply(pending)}
            >
              Confirm sharing
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
