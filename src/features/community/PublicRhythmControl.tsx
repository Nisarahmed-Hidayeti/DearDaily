import { useState } from 'react'
import { Modal } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import { localDay } from '../journal/journalApi'
import { publicRhythmEnabled, rhythmActivity } from './publicRhythm'
export default function PublicRhythmControl({
  saved,
  initial,
}: {
  saved: boolean
  initial?: unknown
}) {
  const { client } = useAuth()
  const [shared, setShared] = useState(!!rhythmActivity(initial)),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  async function apply(enabled: boolean) {
    if (!client || !saved || busy) return
    setBusy(true)
    try {
      const result = await client.rpc('set_public_rhythm', {
        enabled,
        today: localDay(new Date()),
      })
      if (
        result.error ||
        (enabled ? !rhythmActivity(result.data) : result.data !== null)
      )
        throw Error()
      setShared(enabled)
      setConfirm(false)
      setMessage(enabled ? 'Calendar snapshot shared.' : 'Calendar hidden.')
    } catch {
      setMessage('Calendar choice could not be confirmed. Try again.')
    } finally {
      setBusy(false)
    }
  }
  if (!publicRhythmEnabled) return null
  return (
    <section className="panel">
      <h2>Public writing calendar</h2>
      <p>
        Share your writing days from the last 12 weeks. This calendar is a
        snapshot; refresh it when you want to update it.
      </p>
      <div className="account-actions">
        <button
          className="button secondary"
          disabled={!saved || busy}
          onClick={() => {
            setMessage('')
            setConfirm(true)
          }}
        >
          {shared ? 'Refresh shared calendar' : 'Share writing calendar'}
        </button>
        {shared && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void apply(false)}
          >
            Hide writing calendar
          </button>
        )}
      </div>
      <p role="status">{message}</p>
      {confirm && (
        <Modal
          title="Share your writing dates publicly?"
          onClose={() => {
            if (!busy) setConfirm(false)
          }}
        >
          <p>
            Your saved writing days will be public while your profile is public.
            Journal text, moods, and entry counts stay private. Others may save
            a copy.
          </p>
          {message && <p role="alert">{message}</p>}
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
              Share my writing dates
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
