# Tiko Sum — iOS

Native SwiftUI math-communication app: the child types (or follows) a formula,
hears every number and symbol spoken, and answers by choosing from three tiles
— or by saying the number. Never shows a computed result; never says "wrong".
Spec: [`docs/apps/sum.md`](../../../docs/apps/sum.md), plan:
[`docs/plans/sum-ios.md`](../../../docs/plans/sum-ios.md).

Built on the shared TikoKit engine extracted from Say: `TikoVoiceService`
(Atlas voices, offline cache), `TikoCelebrate`, `TikoSpeechPracticeService`,
and `TikoWordMatcher`, plus the standard harness (`TikoAppShell`,
`TikoIdentity`, Parent/Child Mode, `TikoI18n`).

## Build & test

```sh
cd apps/sum/ios
xcodegen generate
xcodebuild -project TikoSum.xcodeproj -scheme TikoSum \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' test
./scripts/validate-local.sh
```

Unit tests cover the per-language `NumberSpeller` (0–100 golden lists for
en/nl/fr/es/de/mt), distractor generation, formula speech composition, the
path store (per-language overrides, custom paths, operator pronunciation),
and the play state machine including the retry ladder and voice answering.

## Notes

- Voice answering is opt-in (parent settings) — by default Sum requests no
  permissions at all; enabling it asks for mic + speech recognition in the
  parent context.
- All keypad utterances are prefetched through the Tiko voice cache, so the
  app is fully usable offline after first use.
- Screenshot scenes for capture/promo: `home`, `practice`, `keypad`,
  `celebrate` (auto-plays) via `--screenshot-mode --screenshot <scene>`.
  `--screenshot-mode` also skips the splash, whose network calls hang
  indefinitely on a simulator with a broken HTTP/3 path — it is the only
  reliable way to reach the UI there.
- The home header carries the operator (`+ − × ÷` and a shuffle tab); the
  choice is remembered in `tiko.sum.operatorChoice`, so tapping a mode tile
  starts the ten immediately. Modes are ranges (`1-5 … 1-100`), bands
  (`10-20`, `20-50`, `50-100`) and number families (the 2s … the 10s).
