export const voiceByteLimit = 5760044
/** Accept only canonical mono PCM16 WAV. No container metadata, compressed codecs or trailing payloads. */
export function validateWav(bytes: Uint8Array) {
  if (bytes.length < 46 || bytes.length > voiceByteLimit || bytes.length % 2)
    throw Error('Invalid WAV size')
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    word = (offset: number) =>
      String.fromCharCode(...bytes.slice(offset, offset + 4))
  if (
    word(0) !== 'RIFF' ||
    word(8) !== 'WAVE' ||
    word(12) !== 'fmt ' ||
    word(36) !== 'data' ||
    v.getUint32(4, true) !== bytes.length - 8 ||
    v.getUint32(16, true) !== 16 ||
    v.getUint16(20, true) !== 1 ||
    v.getUint16(22, true) !== 1 ||
    v.getUint32(24, true) !== 16000 ||
    v.getUint32(28, true) !== 32000 ||
    v.getUint16(32, true) !== 2 ||
    v.getUint16(34, true) !== 16 ||
    v.getUint32(40, true) !== bytes.length - 44
  )
    throw Error('Unsupported WAV format')
  return { bytes, duration: (bytes.length - 44) / 32000 }
}
export async function boundedVoice(request: Request, limit = voiceByteLimit) {
  if (Number(request.headers.get('content-length') ?? 0) > limit)
    throw Error('Audio too large')
  const reader = request.body?.getReader()
  if (!reader) throw Error('Empty audio')
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > limit) {
        await reader.cancel()
        throw Error('Audio too large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

/** Public copies contain only approved samples, never the remainder of a private recording. */
export function excerptWav(bytes: Uint8Array, start: number, end: number) {
  const { duration } = validateWav(bytes)
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end <= start ||
    end > duration
  )
    throw Error('Invalid excerpt')
  const from = Math.ceil(start * 16000),
    to = Math.floor(end * 16000)
  if (to <= from) throw Error('Excerpt too short')
  const pcm = bytes.slice(44 + from * 2, 44 + to * 2),
    result = new Uint8Array(44 + pcm.length)
  result.set(bytes.slice(0, 44))
  result.set(pcm, 44)
  const v = new DataView(result.buffer)
  v.setUint32(4, result.length - 8, true)
  v.setUint32(40, pcm.length, true)
  validateWav(result)
  return result
}
