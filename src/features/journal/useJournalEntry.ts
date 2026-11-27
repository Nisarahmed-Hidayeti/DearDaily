import type { StoryMetadata } from '../community/communityApi'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  draftOf,
  draftFingerprint,
  entryTitle,
  JournalSaveError,
  loadEntry,
  newDraft,
  readStories,
  removeEntry,
  saveEntry,
  publishStory,
  unpublishStory,
} from './journalApi'
import type { Draft, JournalEntry } from './journalApi'

type Recovery = { draft: Draft; version: number | null }

export function useJournalEntry(existingId?: string, newId?: string) {
  const { client, session } = useAuth()
  const userId = session!.user.id
  const [id] = useState(() => existingId ?? newId ?? crypto.randomUUID())
  const [loadInitially] = useState(Boolean(existingId))
  const [initialDraft] = useState(newDraft)
  const [draft, setDraft] = useState<Draft>(initialDraft)
  const [row, setRow] = useState<JournalEntry | null>(null)
  const [confirmed, setConfirmed] = useState(() =>
    draftFingerprint(initialDraft),
  )
  const [ready, setReady] = useState(!existingId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retryDelay, setRetryDelay] = useState(0)
  const retries = useRef(0)
  const [publicVoiceCount, setPublicVoiceCount] = useState(0)
  const [published, setPublished] = useState(false)
  const [publicMetadata, setPublicMetadata] = useState<StoryMetadata | null>(
    null,
  )
  const epoch = useRef(0)
  const lock = useRef(false)
  const pendingSave = useRef<Promise<JournalEntry | undefined> | null>(null)
  const emptyNewPage =
    !row &&
    (!draft.title.trim() || draft.title === entryTitle('', draft.entry_date)) &&
    !draft.body.trim() &&
    !draft.page_icon &&
    !draft.music &&
    draft.mood === 'Calm' &&
    draft.category === 'Personal' &&
    draft.tags.length === 0 &&
    !draft.writing_document?.icon &&
    !draft.writing_document?.publication &&
    !draft.writing_document?.page &&
    (!draft.cover_preset || draft.cover_preset === 'none')
  const dirty = !emptyNewPage && draftFingerprint(draft) !== confirmed
  const recoveryKey = `deardaily.recovery.v1.${userId}.${loadInitially || row ? id : 'new'}`
  const [recovery, setRecovery] = useState<Recovery | null>(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(recoveryKey) ?? 'null',
      ) as Recovery | null
      return stored?.draft && typeof stored.draft.body === 'string'
        ? stored
        : null
    } catch {
      return null
    }
  })
  const [savedLocally, setSavedLocally] = useState(false)
  useEffect(() => {
    if (!ready || recovery) return
    let stored = false
    try {
      if (dirty) {
        localStorage.setItem(
          recoveryKey,
          JSON.stringify({ draft, version: row?.version ?? null }),
        )
        stored = true
      } else {
        localStorage.removeItem(recoveryKey)
      }
    } catch {
      // Storage can be disabled or full.
    }
    let active = true
    queueMicrotask(() => {
      if (active) setSavedLocally(stored)
    })
    return () => {
      active = false
    }
  }, [ready, recovery, dirty, draft, row?.version, recoveryKey])
  const restoreRecovery = () => {
    if (!recovery || recovery.version !== (row?.version ?? null)) return
    setDraft(recovery.draft)
    setRecovery(null)
    setError('')
  }
  const discardRecovery = () => {
    try {
      localStorage.removeItem(recoveryKey)
    } catch {
      // Storage can be disabled.
    }
    setRecovery(null)
  }
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
      setConfirmed(draftFingerprint(draftOf(entry)))
      setRow(entry)
      setPublished(stories.length > 0)
      setPublicVoiceCount(stories[0]?.voice_notes?.length ?? 0)
      setPublicMetadata(
        (stories[0] as (typeof stories)[number] & StoryMetadata) ?? null,
      )
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
      if (loadInitially && generation === epoch.current) void reload()
    })
  }, [loadInitially, reload])
  const save = useCallback(
    (saved = false): Promise<JournalEntry | undefined> => {
      if (lock.current) return pendingSave.current ?? Promise.resolve(undefined)
      if (!client || !ready || recovery) return Promise.resolve(undefined)
      const generation = epoch.current
      const snapshot = {
        ...draft,
        status: saved ? ('saved' as const) : draft.status,
      }
      lock.current = true
      setBusy(true)
      setError('')
      const request = (async () => {
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
          if (!row && !loadInitially) {
            try {
              localStorage.removeItem(recoveryKey)
            } catch {
              // Storage can be disabled.
            }
          }
          retries.current = 0
          setRetryDelay(0)
          setRow(result)
          setConfirmed(draftFingerprint(draftOf(result)))
          // Canonical titles are merged only if the submitted title was not edited meanwhile.
          setDraft((current) => ({
            ...current,
            title:
              current.title === snapshot.title ? result.title : current.title,
            ...(saved ? { status: 'saved' as const } : {}),
          }))
          return result
        } catch (cause) {
          if (generation === epoch.current) {
            if (
              cause instanceof JournalSaveError &&
              cause.kind === 'retryable' &&
              retries.current < 3
            ) {
              setRetryDelay(2000 * 2 ** retries.current)
              retries.current++
            } else {
              setRetryDelay(0)
              setError(
                cause instanceof JournalSaveError
                  ? cause.message
                  : 'Cloud save not confirmed. Keep or export your recovery copy.',
              )
            }
          }
        } finally {
          lock.current = false
          pendingSave.current = null
          if (generation === epoch.current) setBusy(false)
        }
      })()
      pendingSave.current = request
      return request
    },
    [
      client,
      ready,
      draft,
      userId,
      id,
      row,
      loadInitially,
      recoveryKey,
      recovery,
    ],
  )
  useEffect(() => {
    if (!ready || !dirty || busy || error || recovery || !navigator.onLine)
      return
    if (
      !row &&
      !draft.body.trim() &&
      (!draft.title.trim() || draft.title === entryTitle('', draft.entry_date))
    )
      return
    const timer = window.setTimeout(() => void save(), retryDelay || 1200)
    return () => window.clearTimeout(timer)
  }, [
    ready,
    dirty,
    busy,
    error,
    save,
    row,
    draft.title,
    draft.body,
    draft.entry_date,
    recovery,
    retryDelay,
  ])
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
  async function action(
    kind: 'publish' | 'unpublish' | 'delete',
    metadata?: StoryMetadata,
  ) {
    if (
      !client ||
      !row ||
      lock.current ||
      (kind === 'publish' && (dirty || recovery))
    )
      return false
    const generation = epoch.current
    lock.current = true
    setBusy(true)
    setError('')
    try {
      if (kind === 'publish') {
        const story = metadata
          ? await publishStory(client, userId, row, published, metadata)
          : await publishStory(client, userId, row, published)
        if (generation === epoch.current) {
          setPublished(true)
          setPublicVoiceCount(story.voice_notes?.length ?? 0)
          if (metadata) setPublicMetadata(metadata)
        }
      } else if (kind === 'unpublish') {
        await unpublishStory(client, id)
        if (generation === epoch.current) setPublished(false)
      } else await removeEntry(client, userId, id, row.version)
      return generation === epoch.current
    } catch (cause) {
      if (generation === epoch.current)
        setError(
          cause instanceof Error &&
            cause.message.startsWith('Voice notes could not be copied')
            ? cause.message
            : 'The action was not confirmed. Reload to check the server before trying again.',
        )
      return false
    } finally {
      lock.current = false
      if (generation === epoch.current) setBusy(false)
    }
  }
  useEffect(() => {
    const retry = () => {
      if (dirty && !recovery) void save()
    }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [dirty, recovery, save])
  return {
    savedLocally,
    recovery,
    restoreRecovery,
    discardRecovery,
    publicVoiceCount,
    id,
    draft,
    setDraft,
    row,
    ready,
    busy,
    error,
    dirty,
    published,
    publicMetadata,
    save,
    reload,
    action,
  }
}
