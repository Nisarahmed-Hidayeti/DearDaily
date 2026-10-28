import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  draftOf,
  loadEntry,
  newDraft,
  readStories,
  removeEntry,
  saveEntry,
  publishStory,
  unpublishStory,
} from './journalApi'
import type { Draft, JournalEntry } from './journalApi'

export function useJournalEntry(existingId?: string) {
  const { client, session } = useAuth()
  const userId = session!.user.id
  const [id] = useState(() => existingId ?? crypto.randomUUID())
  const [draft, setDraft] = useState<Draft>(newDraft)
  const [row, setRow] = useState<JournalEntry | null>(null)
  const [confirmed, setConfirmed] = useState(() => JSON.stringify(newDraft()))
  const [ready, setReady] = useState(!existingId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [published, setPublished] = useState(false)
  const epoch = useRef(0)
  const lock = useRef(false)
  const dirty = JSON.stringify(draft) !== confirmed
  useEffect(() => {
    const lifetime = epoch
    return () => {
      lifetime.current++
    }
  }, [])
  const reload = useCallback(async () => {
    if (!client) return
    const generation = epoch.current
    setReady(false)
    setError('')
    try {
      const entry = await loadEntry(client, userId, id)
      const stories = await readStories(client, id)
      if (generation !== epoch.current) return
      setDraft(draftOf(entry))
      setConfirmed(JSON.stringify(draftOf(entry)))
      setRow(entry)
      setPublished(stories.length > 0)
      setReady(true)
    } catch {
      if (generation === epoch.current)
        setError(
          'Could not load this entry. Your current words remain here; export them before reloading.',
        )
    }
  }, [client, userId, id])
  useEffect(() => {
    const generation = epoch.current
    void Promise.resolve().then(() => {
      if (existingId && generation === epoch.current) void reload()
    })
  }, [existingId, reload])
  const save = useCallback(
    async (saved = false) => {
      if (!client || !ready || lock.current) return
      const generation = epoch.current
      const snapshot = {
        ...draft,
        status: saved ? ('saved' as const) : draft.status,
      }
      lock.current = true
      setBusy(true)
      setError('')
      try {
        const result = await saveEntry(
          client,
          userId,
          id,
          snapshot,
          row?.version ?? null,
        )
        if (generation !== epoch.current) return
        // Canonical URL survives reload without remounting and losing in-flight edits.
        if (window.location.pathname === '/app/write') {
          window.history.replaceState(
            window.history.state,
            '',
            '/app/write/' + id,
          )
        }
        setRow(result)
        setConfirmed(JSON.stringify(draftOf(result)))
        // Only status is merged; words typed during the request are preserved.
        if (saved) setDraft((current) => ({ ...current, status: 'saved' }))
      } catch {
        if (generation === epoch.current)
          setError(
            'Save not confirmed. Your words are still here. Export a copy, then reload to reconcile a conflict or retry.',
          )
      } finally {
        lock.current = false
        if (generation === epoch.current) setBusy(false)
      }
    },
    [client, ready, draft, userId, id, row],
  )
  useEffect(() => {
    if (!ready || !dirty || busy || error) return
    const timer = window.setTimeout(() => void save(), 1200)
    return () => window.clearTimeout(timer)
  }, [ready, dirty, busy, error, save])
  useEffect(() => {
    if (!dirty && !busy) return
    const before = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const leave = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.('a[href]')
      if (
        anchor &&
        !window.confirm(
          'Some changes are not saved. Leave this page? Export a copy first if you need it.',
        )
      ) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', before)
    document.addEventListener('click', leave, true)
    return () => {
      window.removeEventListener('beforeunload', before)
      document.removeEventListener('click', leave, true)
    }
  }, [dirty, busy])
  async function action(kind: 'publish' | 'unpublish' | 'delete') {
    if (!client || !row || lock.current || (kind === 'publish' && dirty))
      return false
    const generation = epoch.current
    lock.current = true
    setBusy(true)
    setError('')
    try {
      if (kind === 'publish') {
        await publishStory(client, userId, row, published)
        if (generation === epoch.current) setPublished(true)
      } else if (kind === 'unpublish') {
        await unpublishStory(client, id)
        if (generation === epoch.current) setPublished(false)
      } else await removeEntry(client, userId, id, row.version)
      return generation === epoch.current
    } catch {
      if (generation === epoch.current)
        setError(
          'The action was not confirmed. Reload to check the server before trying again.',
        )
      return false
    } finally {
      lock.current = false
      if (generation === epoch.current) setBusy(false)
    }
  }
  return {
    id,
    draft,
    setDraft,
    row,
    ready,
    busy,
    error,
    dirty,
    published,
    save,
    reload,
    action,
  }
}
