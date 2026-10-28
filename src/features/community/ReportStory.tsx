import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
export const reportReasons = {
  harassment: 'Harassment or bullying',
  hate: 'Hate or threats',
  personal_information: 'Personal information exposure',
  spam: 'Spam',
  other: 'Other concern',
}
export default function ReportStory({ id }: { id: string }) {
  const { client, session } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('harassment')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!client || !session || busy) return
    setBusy(true)
    try {
      const { error } = await client.rpc('submit_story_report', {
        story: id,
        reason,
        explanation: text,
      })
      setMessage(
        error
          ? error.code === '23505'
            ? 'You have already reported this story.'
            : error.code === '54000'
              ? 'Daily limit reached. Please try tomorrow.'
              : 'Report not confirmed. The story may be unavailable; reconnect and retry.'
          : 'Report received. Your identity is not shared with the author.',
      )
      if (!error) {
        setOpen(false)
        setText('')
      }
    } catch {
      setMessage(
        'Report not confirmed. Reconnect and retry; duplicates are safely rejected.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button className="button secondary" onClick={() => setOpen(true)}>
        Report story
      </button>
      <p role="status">{message}</p>
      {open && (
        <Modal
          title="Report this public story"
          onClose={() => {
            if (!busy) setOpen(false)
          }}
        >
          {session ? (
            <form onSubmit={(e) => void submit(e)}>
              <p>
                Closed-beta reporting requires sign-in. One report per account
                per story; at most five reports per 24 hours. Avoid including
                sensitive personal information.
              </p>
              <label>
                Reason
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {Object.entries(reportReasons).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Additional context (optional)
                <textarea
                  maxLength={1000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <button className="button" disabled={busy}>
                Submit report
              </button>
            </form>
          ) : (
            <p>
              <Link to="/auth/sign-in">Sign in</Link> to submit a report. This
              protects our small community against automated abuse.
            </p>
          )}
        </Modal>
      )}
    </>
  )
}
