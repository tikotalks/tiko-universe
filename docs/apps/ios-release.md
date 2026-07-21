# iOS release automation

Automated App Store / TestFlight pipeline for the Tiko iOS apps, built on the
shared [`@sil/app-release`](https://www.npmjs.com/package/@sil/app-release) CLI —
the same tool used by the Luys and Mazzi suites. Covers version bumping,
validation, screenshots, promo video, archiving, TestFlight upload, and App Store
metadata sync.

## What ships

Six apps, declared in [`release.config.json`](../../release.config.json):

| Slug | App | Bundle ID | Config |
| --- | --- | --- | --- |
| yes-no | Yes No | `mt.tiko.yesno` | `apps/yes-no/release/ios.json` |
| cards | Tiko Cards | `mt.tiko.cards` | `apps/cards/release/ios.json` |
| talk | Tiko Talk | `mt.tiko.talk` | `apps/talk/release/ios.json` |
| radio | Tiko Radio | `mt.tiko.radio` | `apps/radio/release/ios.json` |
| timer | Tiko Timer | `mt.tiko.timer` | `apps/timer/release/ios.json` |
| type | Tiko Type | `mt.tiko.type` | `apps/type/release/ios.json` |

Store copy lives in `apps/<app>/release/app-store/en-US.json`.

## One-time setup (credentials)

These GitHub repository secrets are required before the upload/metadata workflows
can run. `release:preflight` reports exactly which are still missing.

| Secret | Value |
| --- | --- |
| `APPLE_TEAM_ID` | Your Apple Developer team ID |
| `IOS_CERTIFICATE_BASE64` | base64 of your iOS Distribution `.p12` |
| `IOS_CERTIFICATE_PASSWORD` | password for that `.p12` |
| `APP_STORE_CONNECT_KEY_ID` | App Store Connect API key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | App Store Connect issuer ID |
| `APP_STORE_CONNECT_API_KEY` | base64 of the API key `.p8` |

Create the API key in App Store Connect → Users and Access → Keys, with
**App Manager** (or Admin) access. The distribution certificate + provisioning
are handled by automatic signing during `xcodebuild archive` using the imported
`.p12` and the API key.

Also fill the numeric **`appleId` / `appStoreId`** for each app that has an
App Store Connect record, in `apps/<app>/release/ios.json`.

## Versioning

Version is a build setting, not an Info.plist literal:
- Source of truth: `MARKETING_VERSION` + `CURRENT_PROJECT_VERSION` in each
  app's `ios/Project.yml`.
- `Info.plist` references them as `$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)`.

Bump (one or all apps):

```bash
npm run ios:bump -- --app yes-no --build 4        # build only
npm run ios:bump -- --app all --version 1.1 --build 1
```

Apple rejects reused build numbers, so always increment `CURRENT_PROJECT_VERSION`.

## Local commands (run from repo root)

```bash
npm run release:preflight          # what's ready / missing per app (read-only)
npm run release:validate           # xcodegen + build-setting checks + simulator build
npm run release:screenshots        # capture configured screenshots
npm run release:promo-videos       # record 10s promo videos
npm run release:archive            # archive + export IPA
npm run release:upload-build       # upload IPA to TestFlight (needs ASC secrets)
npm run release:prepare-metadata   # render app-store/*.json → Fastlane Deliver layout
npm run release:upload-metadata    # push metadata to App Store Connect (needs ASC secrets)
npm run release:all                # validate → screenshots → archive → prepare-screenshots
```

To run a single app, invoke the CLI directly with its config:

```bash
npx --yes --package @sil/app-release app-release \
  --config apps/yes-no/release/ios.json --mode screenshots
```

## CI workflows (`.github/workflows/`)

- **`release-validate.yml`** — fast gate on PRs touching iOS: xcodegen generates
  every project, version/encryption build settings are present. No full build.
- **`release-testflight.yml`** — manual (`workflow_dispatch`). Archive + upload one
  app (or all) to TestFlight. Requires typing `UPLOAD_TESTFLIGHT` as `confirm`.
  Matrix, one app at a time (`max-parallel: 1`).
- **`release-metadata.yml`** — manual. `export` renders metadata (dry, artifact
  uploaded) or `upload` pushes it via `fastlane deliver` (requires `SYNC_METADATA`).

## Screenshots & promo video

Capture is deterministic via `xcrun simctl` — no UI-test target. Apps must be
**screenshot-aware**: launched with `--screenshot-mode` + `--screenshot <scene>`,
they render a fixed scene. The shared parser is `TikoScreenshotMode`
(`packages/tikokit-ios/Sources/TikoKit/TikoScreenshotMode.swift`):

```swift
if TikoScreenshotMode.isActive {
    // branch on TikoScreenshotMode.scene ("home", "settings", …)
}
```

- All six apps are wired with the screenshot guard in their root view's
  `.task`/`.onAppear` (skip network/persistence for deterministic, offline-stable
  capture). **yes-no** forces a clean Yes/No set; **type** seeds a sentence for the
  `sentence` scene. **cards / talk / radio** skip their remote load — on a fresh
  simulator their stores are empty, so for non-empty shots either pre-launch once
  to populate the local cache or add seed/demo content behind the guard.
- Scenes per app are defined under `screenshots.scenarios` in each
  `release/ios.json` (`launchArgs: ["--screenshot", "<scene>"]`). Branch on
  `TikoScreenshotMode.scene` in the guard to render scene-specific states
  (e.g. timer "running", an answered state).
- Color mode is driven by UserDefaults `tiko.colorMode` ("light"/"dark"); locale
  by `-AppleLanguages`. The status bar is overridden to 9:41 / wifi / 100%.

Outputs are split across two locations:
- **Screenshots & promo videos** → `~/Projects/Tiko/apps/<app>/screenshots|videos/<version>/…`
  (outside the repo — the `@sil/app-release` CLI normalizes `screenshots.outputDir`
  here, matching the Luys/Mazzi convention, so large device images don't bloat the
  repo). Override per-run with `--output`.
- **Archives / IPAs / Fastlane Deliver metadata** → in-repo `artifacts/<...>`
  (gitignored).

## Apple review notes

See [`yes-no-app-review.md`](./yes-no-app-review.md) for the reviewer reply and
App Review Information notes. Sign-in is optional (device-first); any email
auto-creates an account and is deletable from Account → Delete account.
