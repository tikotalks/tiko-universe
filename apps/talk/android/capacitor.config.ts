import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.tikoapps.talk',
  appName: 'Tiko Talk',
  webDir: '../web/dist',
  android: {
    path: 'android'
  }
}

export default config
