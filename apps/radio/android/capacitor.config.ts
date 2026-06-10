import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.tikoapps.radio',
  appName: 'Tiko Radio',
  webDir: '../web/dist',
  android: {
    path: 'android'
  }
}

export default config
