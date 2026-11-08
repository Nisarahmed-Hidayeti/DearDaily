import { useState } from 'react'
import { Modal } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import { localDay } from '../journal/journalApi'
import { publicStreaksEnabled } from './publicStreakConfig'
export default function PublicStreakControl({
  saved,
  initial,
}: {
  saved: boolean
  initial?: number | null
}) {
  const { client } = useAuth()
  const [streak, setStreak] = useState(initial ?? null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function apply(enabled: boolean) {
    if (!client || !saved || busy) return
    setBusy(true)
    try {
      const result = await client.rpc('set_public_streak', {
        enabled,
        today: localDay(new Date()),
      })
      if (
        result.error ||
        (enabled
          ? !Number.isInteger(result.data) || result.data < 0
          : result.data !== null)
      )
        throw Error()
      setStreak(result.data)
      setConfirm(false)
      setMessage(
        enabled
          ? 'Your chosen streak snapshot is shared on your visible public profile.'
          : 'Your public streak is hidden.',
      )
    } catch {
      setMessage(
        'Your streak choice was not confirmed. Reload before retrying. No success is assumed.',
      )
    } finally {
      setBusy(false)
    }
  }
  if (!publicStreaksEnabled) return null
  return (
    <section className="panel">
      <h2>Your writing streak, your choice.</h2>
      <p>
        Hidden by default. Share only a day count, never your private dates,
        entries or moods. The count is a snapshot: private writing does not
        refresh it automatically. Hidden profiles remain hidden.
      </p>
      <p>
        {streak === null
          ? 'Writing streak is not shared.'
          : `Shared snapshot: ${streak} ${streak === 1 ? 'day' : 'days'}.`}
      </p>
      {!saved && (
        <p>Save your public profile before choosing a shared streak.</p>
      )}
      <div className="account-actions">
        <button
          className="button secondary"
          disabled={!saved || busy}
          onClick={() => setConfirm(true)}
        >
          {streak === null ? 'Share current streak' : 'Refresh shared streak'}
        </button>
        {streak !== null && (
          <button
            className="button secondary"
            disabled={!saved || busy}
            onClick={() => void apply(false)}
          >
            Hide writing streak
          </button>
        )}
      </div>
      <p role="status">{message}</p>
      {confirm && (
        <Modal
          title="Share your writing-streak count?"
          onClose={() => {
            if (!busy) setConfirm(false)
          }}
        >
          <p>
            Your current saved-day count becomes public when your profile is
            visible. No journal dates, text or private details are included. You
            can hide it at any time.
          </p>
          <div className="account-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void apply(true)}
            >
              Share streak snapshot
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
