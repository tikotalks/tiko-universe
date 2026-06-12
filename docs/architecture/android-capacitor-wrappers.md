# Android Capacitor wrappers

Tiko Android is intentionally low priority for now. The Android clients in this repo are thin, replaceable Capacitor shells around the existing web apps.

## Doctrine

- Keep Android-specific code out of `apps/*/web`.
- Keep one wrapper per product app under `apps/<app>/android`.
- Treat the wrapper as disposable: a future Kotlin/Jetpack Compose client can replace it without changing the web app contract.
- The web app should not branch on Android/container state. If Android needs platform behavior later, add it in the wrapper/native plugin layer.
- Do not add admin/marketing Android wrappers unless there is a product reason; these wrappers target child/product apps.

## Current wrappers

This list must match `tools/android-wrappers.mjs`; update both when adding or removing a wrapper.

- `apps/yes-no/android` — `org.tikoapps.yesno`
- `apps/cards/android` — `org.tikoapps.cards`
- `apps/type/android` — `org.tikoapps.type`
- `apps/sequence/android` — `org.tikoapps.sequence`
- `apps/timer/android` — `org.tikoapps.timer`
- `apps/todo/android` — `org.tikoapps.todo`
- `apps/radio/android` — `org.tikoapps.radio`
- `apps/talk/android` — `org.tikoapps.talk`

## Commands

From the repository root:

```bash
# List wrappers
node tools/android-wrappers.mjs list

# Build web bundles and sync them into native projects
node tools/android-wrappers.mjs sync

# Sync a subset
node tools/android-wrappers.mjs sync yes-no cards

# Build debug APKs after syncing; requires JDK + Android SDK
node tools/android-wrappers.mjs build-android
```

From an individual wrapper directory:

```bash
npm run sync
npm run build:android
```

`npm run sync` always rebuilds the existing web workspace first and then runs `cap sync android`. The generated web assets under `android/app/src/main/assets` are ignored; they are derived from `../web/dist` and should be recreated by sync/build commands instead of edited or committed.

## Validation expectations

On a plain Linux VPS without Java/Android SDK, validate:

```bash
node tools/android-wrappers.mjs sync
```

On a machine or CI runner with JDK and Android SDK, validate:

```bash
node tools/android-wrappers.mjs build-android
```

Do not report an Android wrapper as runtime-validated until it has been installed and opened on an emulator or real Android device. A successful Gradle build only proves the APK/AAB compiles.
