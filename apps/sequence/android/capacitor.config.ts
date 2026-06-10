import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.tikoapps.sequence',
  appName: 'Tiko Sequence',
  webDir: '../web/dist',
  android: {
    path: 'android'
  }
}

export default config
