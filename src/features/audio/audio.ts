export const voiceNotesEnabled =
  import.meta.env.VITE_ENABLE_VOICE_NOTES === 'true'
export const maxAudioSeconds = 180
export const audioRate = 16000
export interface VoiceNote {
  id: string
  title: string
  start: number
  end: number
  share?: boolean
}
export function validateVoiceNotes(
  value: unknown,
  privateCopy = true,
): VoiceNote[] {
  if (!Array.isArray(value) || value.length > 3)
    throw Error('At most three voice notes per page')
  const seen = new Set<string>()
  return value.map((n: VoiceNote) => {
    if (
      !n ||
      typeof n !== 'object' ||
      Object.keys(n).some(
        (k) =>
          !(
            privateCopy
              ? ['id', 'title', 'start', 'end', 'share']
              : ['id', 'title', 'start', 'end']
          ).includes(k),
      ) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        n.id,
      ) ||
      seen.has(n.id) ||
      typeof n.title !== 'string' ||
      n.title.length > 80 ||
      !Number.isFinite(n.start) ||
      !Number.isFinite(n.end) ||
      n.start < 0 ||
      n.end <= n.start ||
      n.end > maxAudioSeconds ||
      (privateCopy && typeof n.share !== 'boolean')
    )
      throw Error('Invalid voice note')
    seen.add(n.id)
    return { ...n }
  })
}
export function encodeWav(samples: Float32Array): Blob {
  if (!samples.length || samples.length > audioRate * maxAudioSeconds)
    throw Error('Audio must be between a moment and three minutes')
  const bytes = new ArrayBuffer(44 + samples.length * 2),
    view = new DataView(bytes)
  const word = (offset: number, text: string) =>
    [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  word(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  word(8, 'WAVE')
  word(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, audioRate, true)
  view.setUint32(28, audioRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  word(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  samples.forEach((sample, i) => {
    const s = Number.isFinite(sample) ? Math.max(-1, Math.min(1, sample)) : 0
    view.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true)
  })
  return new Blob([bytes], { type: 'audio/wav' })
}
export async function prepareAudio(file: Blob) {
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw Error('Choose audio smaller than 20 MB')
  const context = new AudioContext()
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer())
    if (
      !Number.isFinite(decoded.duration) ||
      decoded.duration <= 0 ||
      decoded.duration > maxAudioSeconds
    )
      throw Error('Choose a recording of three minutes or less')
    const renderer = new OfflineAudioContext(
        1,
        Math.floor(decoded.duration * audioRate),
        audioRate,
      ),
      source = renderer.createBufferSource()
    source.buffer = decoded
    source.connect(renderer.destination)
    source.start()
    const mono = await renderer.startRendering()
    return {
      blob: encodeWav(mono.getChannelData(0)),
      duration: mono.length / audioRate,
    }
  } finally {
    await context.close()
  }
}
export function audioTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}
