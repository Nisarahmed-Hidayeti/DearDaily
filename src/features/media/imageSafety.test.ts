import { describe, it, expect } from 'vitest'
import {
  detectImage,
  validateImageInput,
  validateImageDimensions,
  imageLimits,
} from './imageSafety'
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
const file = { name: 'photo.png', type: 'image/png', size: 1024 }
describe('upload preparation (not server upload security)', () => {
  it('accepts matching signatures, names and types', () =>
    expect(validateImageInput(file, png, 0)).toBe('image/png'))
  it('detects JPEG and WebP signatures', () => {
    expect(
      detectImage(new Uint8Array([255, 216, 255, ...Array(9).fill(0)])),
    ).toBe('image/jpeg')
    expect(detectImage(new TextEncoder().encode('RIFF0000WEBP'))).toBe(
      'image/webp',
    )
  })
  it.each(['photo.svg', 'photo.png.svg', 'photo.gif', 'photo.html'])(
    'rejects unsafe name %s',
    (name) =>
      expect(() => validateImageInput({ ...file, name }, png, 0)).toThrow(),
  )
  it('rejects spoofed MIME and signatures', () => {
    expect(() =>
      validateImageInput({ ...file, type: 'image/jpeg' }, png, 0),
    ).toThrow()
    expect(() => validateImageInput(file, new Uint8Array(12), 0)).toThrow()
  })
  it('enforces byte and quantity limits', () => {
    expect(() =>
      validateImageInput({ ...file, size: imageLimits.bytes + 1 }, png, 0),
    ).toThrow()
    expect(() => validateImageInput(file, png, 10)).toThrow()
    expect(() => validateImageInput(file, png, -1)).toThrow()
  })
  it('bounds decoded image dimensions', () => {
    expect(() => validateImageDimensions(6000, 4000)).not.toThrow()
    expect(() => validateImageDimensions(6001, 4000)).toThrow()
    expect(() => validateImageDimensions(0, 1)).toThrow()
  })
})
