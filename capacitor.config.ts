import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.deardaily.mobile',
  appName: 'DearDaily',
  webDir: 'dist',
  loggingBehavior: 'none',
  android: { webContentsDebuggingEnabled: false },
}

export default config
