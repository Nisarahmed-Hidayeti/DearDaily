import { expect, it } from 'vitest'
import { cropRect } from './crop'
it('keeps square and wide crops within the original at every zoom and edge', () => {
  for (const [w, h] of [
    [3000, 1000],
    [800, 1600],
    [512, 512],
  ])
    for (const ratio of [1, 2.5])
      for (const zoom of [1, 2, 3])
        for (const x of [0, 50, 100])
          for (const y of [0, 50, 100]) {
            const r = cropRect(w, h, ratio, { zoom, x, y })
            expect(r.x).toBeGreaterThanOrEqual(0)
            expect(r.y).toBeGreaterThanOrEqual(0)
            expect(r.x + r.width).toBeLessThanOrEqual(w + 0.00001)
            expect(r.y + r.height).toBeLessThanOrEqual(h + 0.00001)
            expect(r.width / r.height).toBeCloseTo(ratio)
          }
})
it('rejects invalid crop coordinates instead of sampling outside the image', () => {
  for (const crop of [
    { zoom: 0, x: 50, y: 50 },
    { zoom: 4, x: 50, y: 50 },
    { zoom: 1, x: -1, y: 50 },
    { zoom: 1, x: 50, y: 101 },
    { zoom: NaN, x: 50, y: 50 },
  ])
    expect(() => cropRect(1000, 500, 1, crop)).toThrow()
})
