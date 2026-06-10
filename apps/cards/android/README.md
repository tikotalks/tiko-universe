# Tiko Cards Android wrapper

Capacitor wrapper for the existing `cards` web app. This wrapper must not add Android-specific code to `../web`; Android-specific configuration belongs here.

## Commands

```bash
# from this directory
npm run sync
npm run build:android
```

`npm run sync` builds the web workspace and copies the resulting `../web/dist` into the native Android project. `npm run build:android` additionally runs Gradle's debug APK build.
