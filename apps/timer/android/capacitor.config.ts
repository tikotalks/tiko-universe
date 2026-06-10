import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.tikoapps.timer',
  appName: 'Tiko Timer',
  webDir: '../web/dist',
  android: {
    path: 'android'
  }
}

export default config
