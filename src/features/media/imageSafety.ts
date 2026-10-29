/** Client preparation only. A trusted upload endpoint must independently decode,
 * re-encode and enforce quotas before any future Storage feature is enabled. */
export const imageLimits = {
  bytes: 5 * 1024 * 1024,
  perEntry: 10,
  pixels: 24_000_000,
} as const
export type ImageKind = 'image/jpeg' | 'image/png' | 'image/webp'
export function detectImage(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return 'image/jpeg'
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n))
    return 'image/png'
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp'
  return null
}
export function validateImageInput(
  input: { name: string; type: string; size: number },
  header: Uint8Array,
  currentCount: number,
): ImageKind {
  if (
    !Number.isInteger(currentCount) ||
    currentCount < 0 ||
    currentCount >= imageLimits.perEntry
  )
    throw new Error('A page can contain at most 10 photos.')
  if (
    !Number.isSafeInteger(input.size) ||
    input.size <= 0 ||
    input.size > imageLimits.bytes
  )
    throw new Error('Choose a photo smaller than 5 MiB.')
  const kind = detectImage(header)
  const extensions: Record<ImageKind, RegExp> = {
    'image/jpeg': /\.jpe?g$/i,
    'image/png': /\.png$/i,
    'image/webp': /\.webp$/i,
  }
  if (!kind || kind !== input.type || !extensions[kind].test(input.name))
    throw new Error(
      'Choose a matching JPEG, PNG or WebP photo. SVG and other formats are unavailable.',
    )
  return kind
}
export function validateImageDimensions(width: number, height: number) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > imageLimits.pixels
  )
    throw new Error('Photo dimensions exceed the 24-megapixel limit.')
}
