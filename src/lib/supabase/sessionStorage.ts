// Persist only SDK-owned authentication keys; journal content never uses this store.
export const persistentAuthStorage = {
  getItem(key: string) {
    const current = window.localStorage.getItem(key)
    if (current !== null) return current
    const previous = window.sessionStorage.getItem(key)
    if (previous !== null) {
      window.localStorage.setItem(key, previous)
      window.sessionStorage.removeItem(key)
    }
    return previous
  },
  setItem(key: string, value: string) {
    window.localStorage.setItem(key, value)
    window.sessionStorage.removeItem(key)
  },
  removeItem(key: string) {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}
