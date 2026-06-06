import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.tikoapps.cards',
  appName: 'Tiko Cards',
  webDir: '../web/dist',
  android: {
    path: 'android'
  }
}

export default config
