# Tiko Say — iOS

Native SwiftUI speech-practice app. The child picks a category, sees one card,
hears its word, repeats it, and Apple speech recognition triggers a celebration
when the word is heard. Spec: [`docs/apps/say.md`](../../../docs/apps/say.md),
plan: [`docs/plans/say-ios-mvp.md`](../../../docs/plans/say-ios-mvp.md).

Runs on the standard Tiko harness (`packages/tikokit-ios`): `TikoAppShell`,
`TikoIdentity` device-first bootstrap, shared Parent Mode / Child Mode model,
`TikoI18n` localisation. Cards (title / speak text / listen-for) are editable
per language in Parent Mode; bundled content is defaults, not fixed data.

## Build

Requires Xcode 16+, XcodeGen and Node (the shared app-config generator runs as
a pre-build step).

```sh
cd apps/say/ios
xcodegen generate
open TikoSay.xcodeproj
```

Or from the command line:

```sh
xcodebuild -project TikoSay.xcodeproj -scheme TikoSay \
  -destination 'platform=iOS Simulator,name=iPhone 17' build
```

## Test

```sh
xcodebuild -project TikoSay.xcodeproj -scheme TikoSay \
  -destination 'platform=iOS Simulator,name=iPhone 17' test
```

Unit tests cover the word matcher (per-language normalisation, approved
phrases, conservative fuzzy rules), the practice state machine (retry ladder,
skip, interruption, permission and availability paths), the card store
(overrides, per-language scoping, custom cards, persistence) and the bundled
catalogue. UI tests cover launch and the category → permission flow.

Full local validation (project lint + simulator build):

```sh
./scripts/validate-local.sh
```

## Debug overlay

Development builds expose a recognition debug overlay (state, transcripts,
match type, attempt, locale, on-device support) via the `--say-debug` launch
argument or a 2-second long press on the practice screen.

## Notes

- Speech recognition prefers on-device processing and stops on backgrounding
  or navigation; no audio is stored, transcripts are discarded per attempt.
- If the active app language has no recognizer on the device, practice falls
  back to the nearest supported language with a parent-facing notice.
- Recognition quality must be validated on physical devices — the simulator
  is not sufficient (see the plan's manual device matrix).
