import { useEffect, useState } from 'react'
import { PageHeading, Modal } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import type { ReportItem } from './communityApi'
export default function Moderation() {
  const { client } = useAuth()
  const [items, setItems] = useState<ReportItem[]>([])
  const [message, setMessage] = useState('Checking moderator access…')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<ReportItem | null>(null)
  const [decision, setDecision] = useState('dismiss')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    if (!client) return
    void client.rpc('moderation_queue').then(({ data, error }) => {
      if (active) {
        setItems(error ? [] : (data ?? []))
        setMessage(
          error
            ? 'Access denied or moderation unavailable. Backend authorization is required.'
            : '',
        )
      }
    })
    return () => {
      active = false
    }
  }, [client, retry])
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!client || !selected || busy) return
    setBusy(true)
    const { error } = await client.rpc('moderate_report', {
      report: selected.id,
      decision,
      note,
    })
    setBusy(false)
    setMessage(
      error
        ? 'Decision not confirmed. Refresh before retrying.'
        : 'Decision recorded in the private audit log.',
    )
    setSelected(null)
    setNote('')
    setRetry((n) => n + 1)
  }
  return (
    <div className="page">
      <PageHeading eyebrow="Closed beta / Restricted" title="Community care." />
      <p role="status">{message}</p>
      {items.map((r) => (
        <section className="panel" key={r.id}>
          <p className="eyebrow">
            {r.reason} · {new Date(r.created_at).toLocaleDateString()}
          </p>
          <h2>{r.title ?? 'Story no longer public'}</h2>
          <p className="profile-bio">{r.explanation}</p>
          <details>
            <summary>Review public text</summary>
            <p className="profile-bio">{r.body ?? 'Unavailable'}</p>
          </details>
          <button
            className="button secondary"
            onClick={() => {
              setSelected(r)
              setDecision('dismiss')
            }}
          >
            Review decision
          </button>
        </section>
      ))}
      {!message && !items.length && (
        <p className="panel">No unresolved reports.</p>
      )}
      {selected && (
        <Modal
          title="Record moderation decision"
          onClose={() => {
            if (!busy) setSelected(null)
          }}
        >
          <form onSubmit={(e) => void submit(e)}>
            <label>
              Decision
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option value="dismiss">Dismiss report</option>
                <option value="remove">
                  Remove public story and block republication of this entry
                </option>
              </select>
            </label>
            <p>
              The private source entry remains saved. Decisions are audited.
              This tool cannot grant moderator privileges.
            </p>
            <label>
              Decision note
              <textarea
                required
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button className="button" disabled={busy || !note.trim()}>
              Confirm decision
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
