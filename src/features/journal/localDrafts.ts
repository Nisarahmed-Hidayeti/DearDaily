import type { Draft } from './journalApi'

const STORAGE_KEY = 'deardaily.device-drafts.v1'

export interface DeviceDraft extends Draft {
  id: string
  updated_at: string
}

function readAll(): DeviceDraft[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter(
      (item): item is DeviceDraft =>
        item &&
        typeof item.id === 'string' &&
        typeof item.updated_at === 'string' &&
        typeof item.title === 'string' &&
        typeof item.body === 'string' &&
        typeof item.entry_date === 'string',
    )
  } catch {
    return []
  }
}

export function listDeviceDrafts(): DeviceDraft[] {
  return readAll().sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function getDeviceDraft(id: string): DeviceDraft | undefined {
  return readAll().find((draft) => draft.id === id)
}

export function saveDeviceDraft(draft: Draft, id: string): boolean {
  try {
    const drafts = readAll().filter((item) => item.id !== id)
    drafts.push({ ...draft, id, updated_at: new Date().toISOString() })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
    return true
  } catch {
    return false
  }
}

export function deleteDeviceDraft(id: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(readAll().filter((draft) => draft.id !== id)),
    )
  } catch {
    // Local storage may be unavailable or full.
  }
}
