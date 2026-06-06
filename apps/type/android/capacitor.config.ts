import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.tikoapps.type',
  appName: 'Tiko Type',
  webDir: '../web/dist',
  android: {
    path: 'android'
  }
}

export default config
