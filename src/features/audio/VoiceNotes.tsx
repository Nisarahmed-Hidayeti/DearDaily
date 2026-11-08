import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { audioTime, prepareAudio, type VoiceNote } from './audio'
import { voiceUrl } from './audioApi'
import { authConfig } from '../../lib/supabase/client'

export function VoicePlayer({
  note,
  publicCopy = false,
  localSource,
}: {
  note: VoiceNote
  localSource?: string
  publicCopy?: boolean
}) {
  const { client, session } = useAuth(),
    audio = useRef<HTMLAudioElement>(null)
  const [loadedFor, setLoadedFor] = useState('')
  const [url, setUrl] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false)
  return (
    <div className="voice-player">
      <div className="row spread">
        <span>{note.title || 'Voice note'}</span>
        <small>
          {audioTime(note.start)}–{audioTime(note.end)}
        </small>
      </div>
      {!(
        (localSource || url) &&
        (localSource || publicCopy || loadedFor === session?.user.id)
      ) ? (
        <button
          type="button"
          className="text-button"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            setError('')
            try {
              if (publicCopy) {
                if (!authConfig) throw Error('Recording unavailable')
                setUrl(
                  `${authConfig.url}/functions/v1/voice-gateway?public=${encodeURIComponent(note.id)}`,
                )
              } else {
                if (!client) throw Error('Recording unavailable')
                setLoadedFor(session?.user.id ?? '')
                setUrl(await voiceUrl(client, note.id))
              }
            } catch {
              setError('Could not load this recording. Try again.')
            } finally {
              setLoading(false)
            }
          }}
        >
          {loading ? 'Loading…' : '▶ Listen'}
        </button>
      ) : (
        <audio
          ref={audio}
          controls
          autoPlay={!localSource}
          preload="metadata"
          src={localSource || url}
          aria-label={note.title || 'Voice note'}
          onLoadedMetadata={() => {
            if (audio.current)
              audio.current.currentTime = publicCopy ? 0 : note.start
          }}
          onPlay={() => {
            const a = audio.current
            if (
              a &&
              (a.currentTime < (publicCopy ? 0 : note.start) ||
                a.currentTime >=
                  (publicCopy ? note.end - note.start : note.end))
            )
              a.currentTime = publicCopy ? 0 : note.start
          }}
          onTimeUpdate={() => {
            const a = audio.current
            if (
              a &&
              a.currentTime >= (publicCopy ? note.end - note.start : note.end)
            ) {
              a.pause()
              a.currentTime = publicCopy ? 0 : note.start
            }
          }}
          onError={() => {
            setUrl('')
            setError('Recording expired or unavailable. Load it again.')
          }}
        />
      )}
      {error && <small role="alert">{error}</small>}
    </div>
  )
}
export function VoiceNotes({
  notes,
  onChange,
  onUpload,
  disabled = false,
  publicCopy = false,
  localSources,
}: {
  notes: VoiceNote[]
  localSources?: Record<string, string>
  onChange?: (notes: VoiceNote[]) => void
  onUpload?: (blob: Blob) => Promise<string>
  disabled?: boolean
  publicCopy?: boolean
}) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [pending, setPending] = useState<{
      blob: Blob
      duration: number
      url: string
    } | null>(null),
    [start, setStart] = useState(0),
    [end, setEnd] = useState(0)
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    alive = useRef(true)
  const stopTracks = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    if (timer.current) clearTimeout(timer.current)
  }
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (recorder.current?.state === 'recording') recorder.current.stop()
      stopTracks()
    }
  }, [])
  useEffect(
    () => () => {
      if (pending) URL.revokeObjectURL(pending.url)
    },
    [pending],
  )
  useEffect(() => {
    if (!pending && !recording) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    const leave = (e: MouseEvent) => {
      const anchor = (e.target as Element)?.closest('a[href]')
      if (
        anchor &&
        !anchor.hasAttribute('download') &&
        !window.confirm(
          'This recording is not attached yet. Download a backup or add it to your page before leaving. Leave anyway?',
        )
      ) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('click', leave, true)
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      window.removeEventListener('click', leave, true)
    }
  }, [pending, recording])
  const prepare = async (file: Blob) => {
    setBusy(true)
    setError('')
    try {
      const p = await prepareAudio(file)
      if (alive.current) {
        setPending({ ...p, url: URL.createObjectURL(p.blob) })
        setStart(0)
        setEnd(p.duration)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audio could not be prepared')
    } finally {
      if (alive.current) setBusy(false)
    }
  }
  if (publicCopy && !notes.length) return null
  return (
    <section className="voice-notes" aria-label="Voice notes">
      <div className="row spread">
        <h3>Voice notes</h3>
        {onChange && (
          <button
            type="button"
            className="text-button"
            aria-expanded={open}
            disabled={recording || busy || !!pending}
            onClick={() => setOpen(!open)}
          >
            {' '}
            {open ? 'Done' : '+ Add audio'}
          </button>
        )}
      </div>
      {notes.map((n, i) => (
        <div className="voice-note" key={n.id}>
          <VoicePlayer
            note={n}
            publicCopy={publicCopy}
            localSource={localSources?.[n.id]}
          />
          {onChange && open && (
            <div className="voice-note-options">
              <label>
                Name
                <input
                  value={n.title}
                  maxLength={80}
                  disabled={disabled || busy || recording}
                  onChange={(e) =>
                    onChange(
                      notes.map((v, j) =>
                        j === i ? { ...v, title: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label className="row">
                <input
                  type="checkbox"
                  checked={!!n.share}
                  disabled={disabled || busy || recording}
                  onChange={(e) =>
                    onChange(
                      notes.map((v, j) =>
                        j === i ? { ...v, share: e.target.checked } : v,
                      ),
                    )
                  }
                />
                Include in public copy
              </label>
              <button
                type="button"
                className="text-button"
                disabled={disabled || busy || recording}
                onClick={() => onChange(notes.filter((_, j) => i !== j))}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
      {open && onChange && (
        <div className="voice-compose">
          {!pending && (
            <>
              <div className="row">
                <button
                  type="button"
                  className="button secondary"
                  disabled={
                    !recording &&
                    (disabled || busy || notes.length >= 3 || !onUpload)
                  }
                  onClick={async () => {
                    if (recording) {
                      recorder.current?.stop()
                      return
                    }
                    setError('')
                    try {
                      if (
                        !navigator.mediaDevices?.getUserMedia ||
                        !window.MediaRecorder
                      )
                        throw Error(
                          'Recording is unavailable here. Upload an audio file instead.',
                        )
                      const media = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                      })
                      if (!alive.current) {
                        media.getTracks().forEach((t) => t.stop())
                        return
                      }
                      stream.current = media
                      const r = new MediaRecorder(media),
                        chunks: BlobPart[] = []
                      recorder.current = r
                      r.ondataavailable = (e) => {
                        if (e.data.size) chunks.push(e.data)
                      }
                      r.onstop = () => {
                        stopTracks()
                        if (alive.current) {
                          setRecording(false)
                          void prepare(new Blob(chunks, { type: r.mimeType }))
                        }
                      }
                      r.onerror = () => {
                        stopTracks()
                        setRecording(false)
                        setError('Recording stopped. Try again.')
                      }
                      r.start()
                      setRecording(true)
                      timer.current = setTimeout(() => {
                        if (r.state === 'recording') r.stop()
                      }, 180000)
                    } catch (e) {
                      stopTracks()
                      setError(
                        e instanceof Error
                          ? e.message
                          : 'Microphone unavailable',
                      )
                    }
                  }}
                >
                  {recording ? '■ Stop recording' : '● Record'}
                </button>
                <label className="button secondary">
                  Upload audio
                  <input
                    className="sr-only"
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/webm,audio/ogg,audio/mp4"
                    disabled={
                      disabled ||
                      busy ||
                      recording ||
                      notes.length >= 3 ||
                      !onUpload
                    }
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.currentTarget.value = ''
                      if (file) void prepare(file)
                    }}
                  />
                </label>
              </div>
              <small>
                {recording
                  ? 'Recording · stops at 3 minutes'
                  : 'Up to 3 notes · 3 minutes each'}
              </small>
            </>
          )}
          {busy && <p role="status">Preparing or uploading audio…</p>}
          {pending && (
            <>
              <VoicePlayer
                note={{ id: 'preview', title: 'Preview selection', start, end }}
                localSource={pending.url}
              />
              <div className="voice-trim">
                <label>
                  From (seconds)
                  <input
                    type="number"
                    min="0"
                    max={end - 0.1}
                    step="0.1"
                    value={start}
                    onChange={(e) => setStart(Number(e.target.value))}
                  />
                </label>
                <label>
                  To (seconds)
                  <input
                    type="number"
                    min={start + 0.1}
                    max={pending.duration}
                    step="0.1"
                    value={end}
                    onChange={(e) => setEnd(Number(e.target.value))}
                  />
                </label>
              </div>
              <div className="row">
                <button
                  type="button"
                  className="button"
                  disabled={
                    busy ||
                    disabled ||
                    !onUpload ||
                    start < 0 ||
                    end <= start ||
                    end > pending.duration
                  }
                  onClick={async () => {
                    setBusy(true)
                    setError('')
                    try {
                      const id = await onUpload!(pending.blob)
                      onChange([
                        ...notes,
                        { id, title: 'Voice note', start, end, share: false },
                      ])
                      setPending(null)
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : 'Upload not confirmed',
                      )
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Add to page
                </button>
                <a
                  className="text-button"
                  href={pending.url}
                  download="deardaily-voice-note.wav"
                >
                  Download backup
                </a>
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => setPending(null)}
                >
                  Discard
                </button>
              </div>
            </>
          )}
          {!onUpload && <small>Cloud audio is not enabled yet.</small>}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
