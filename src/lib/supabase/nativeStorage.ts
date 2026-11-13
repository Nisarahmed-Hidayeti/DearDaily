import { Capacitor, registerPlugin } from '@capacitor/core'

export const isAndroidApp = Capacitor.getPlatform() === 'android'

interface SessionVault {
  read(options: { key: string }): Promise<{ value?: string }>
  write(options: { key: string; value: string }): Promise<void>
  remove(options: { key: string }): Promise<void>
}

const vault = registerPlugin<SessionVault>('SessionVault')

export const nativeAuthStorage = {
  async getItem(key: string) {
    return (await vault.read({ key })).value ?? null
  },
  setItem(key: string, value: string) {
    return vault.write({ key, value })
  },
  removeItem(key: string) {
    return vault.remove({ key })
  },
}
