import { describe, it, expect } from 'vitest'
import { encodeWav, validateVoiceNotes, audioTime } from './audio'
import {
  validateWav,
  excerptWav,
  boundedVoice,
} from '../../../supabase/functions/_shared/voice'
const id = '81000000-0000-4000-8000-000000000001'
async function bytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer())
}
describe('bounded voice files and deliberate excerpts', () => {
  it('encodes canonical PCM without retaining source metadata', async () => {
    const data = await bytes(encodeWav(new Float32Array(16000).fill(0.5)))
    expect(validateWav(data).duration).toBe(1)
    expect(data.length).toBe(32044)
    expect(new DataView(data.buffer).getInt16(44, true)).toBe(16383)
  })
  it('physically removes all samples outside the approved public excerpt', async () => {
    const input = new Float32Array(16000 * 20)
    input.fill(0.8, 0, 16000 * 10)
    input.fill(0.2, 16000 * 10, 16000 * 19)
    input.fill(-0.8, 16000 * 19)
    const source = await bytes(encodeWav(input)),
      clip = excerptWav(source, 10, 19)
    expect(validateWav(clip).duration).toBe(9)
    const v = new DataView(clip.buffer)
    for (let offset = 44; offset < clip.length; offset += 2)
      expect(v.getInt16(offset, true)).toBe(6553)
    expect(validateWav(source).duration).toBe(20)
  })
  it('rejects MP3 disguised as WAV, extra chunks, invalid headers and oversized duration', async () => {
    const valid = await bytes(encodeWav(new Float32Array(16000)))
    for (const offset of [0, 8, 12, 16, 20, 22, 24, 28, 32, 34, 36, 40]) {
      const b = valid.slice()
      b[offset] ^= 255
      expect(() => validateWav(b)).toThrow()
    }
    expect(() => validateWav(new Uint8Array([...valid, 0, 0]))).toThrow()
    expect(() => encodeWav(new Float32Array(16000 * 181))).toThrow()
    for (const range of [
      [-1, 1],
      [1, 1],
      [0, 2],
      [NaN, 1],
    ])
      expect(() => excerptWav(valid, ...(range as [number, number]))).toThrow()
  })
  it('bounds streamed uploads independently of claimed content length', async () => {
    await expect(
      boundedVoice(
        new Request('http://local', { method: 'POST', body: '123456' }),
        5,
      ),
    ).rejects.toThrow()
  })
  it('validates private/public envelopes without accepting arbitrary URLs or hidden sharing fields', () => {
    const note = { id, title: 'A thought', start: 10, end: 19, share: false }
    expect(validateVoiceNotes([note])).toEqual([note])
    expect(() => validateVoiceNotes([note], false)).toThrow()
    expect(() =>
      validateVoiceNotes([{ ...note, url: 'javascript:evil' }]),
    ).toThrow()
    expect(() => validateVoiceNotes([note, note])).toThrow()
    expect(() => validateVoiceNotes([{ ...note, end: 181 }])).toThrow()
    expect(() => validateVoiceNotes([{ ...note, start: NaN }])).toThrow()
    expect(audioTime(79)).toBe('1:19')
  })
})
