import { PhotonImage, resize, SamplingFilter } from '@cf-wasm/photon/node'
import { imageSize } from 'image-size'
export const uploadByteLimit = 5 * 1024 * 1024
export function photoKind(b: Uint8Array) {
  if (b.length < 12) return null
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return 'image/jpeg'
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => b[i] === n))
    return 'image/png'
  if (
    String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp'
  return null
}
/** Trusted decoder. Header/MIME agreement alone is never accepted as validation. */
export function sanitizePhoto(input: Uint8Array, mime: string) {
  if (
    !input.length ||
    input.length > uploadByteLimit ||
    photoKind(input) !== mime
  )
    throw Error('Invalid photo format or size')
  const dimensions = imageSize(input)
  if (
    !dimensions.width ||
    !dimensions.height ||
    dimensions.width * dimensions.height > 8_000_000
  )
    throw Error('Photo exceeds the processed pixel limit')
  let source: PhotonImage | undefined, output: PhotonImage | undefined
  try {
    source = PhotonImage.new_from_byteslice(input)
    const width = source.get_width(),
      height = source.get_height()
    if (width !== dimensions.width || height !== dimensions.height)
      throw Error('Inconsistent image dimensions')
    const scale = Math.min(1, 1600 / Math.max(width, height))
    if (scale < 1)
      output = resize(
        source,
        Math.max(1, Math.round(width * scale)),
        Math.max(1, Math.round(height * scale)),
        SamplingFilter.Lanczos3,
      )
    const image = output ?? source,
      bytes = image.get_bytes_webp()
    if (bytes.length > uploadByteLimit)
      throw Error('Optimized photo is still too large')
    return {
      bytes,
      width: image.get_width(),
      height: image.get_height(),
      mime: 'image/webp' as const,
    }
  } finally {
    output?.free()
    source?.free()
  }
}
export async function readBounded(request: Request, limit = uploadByteLimit) {
  const reader = request.body?.getReader()
  if (!reader) throw Error('Empty upload')
  const parts: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.length
      if (length > limit) {
        await reader.cancel()
        throw Error('Upload too large')
      }
      parts.push(value)
    }
    const result = new Uint8Array(length)
    let offset = 0
    for (const part of parts) {
      result.set(part, offset)
      offset += part.length
    }
    return result
  } finally {
    reader.releaseLock()
  }
}
