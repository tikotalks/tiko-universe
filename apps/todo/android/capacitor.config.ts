import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.tikoapps.todo',
  appName: 'Tiko Todo',
  webDir: '../web/dist',
  android: {
    path: 'android'
  }
}

export default config
