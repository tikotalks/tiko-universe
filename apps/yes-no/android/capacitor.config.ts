import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.tikoapps.yesno',
  appName: 'Tiko Yes No',
  webDir: '../web/dist',
  android: {
    path: 'android'
  }
}

export default config
