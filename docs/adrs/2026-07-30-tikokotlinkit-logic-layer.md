# ADR: TikoKotlinKit — a shared Kotlin logic layer, and TikoKit as pure UI

Date: 2026-07-30

## Status

Accepted for Tier 0. Tiers 1 and 2 are accepted **in direction only** and each require their own implementation note before code moves.

## Context

`packages/tikokit-ios` (TikoKit) is 21,232 lines of Swift and is the foundation of eleven shipped iOS apps. It mixes two very different things:

- **UI** — `TikoAppShell`, `TikoPopupSheets` (17 SwiftUI views), `TikoChoiceGrid`, `TikoTile`, `TikoCard`, `TikoCelebrate`, `TikoFormFields`, `TikoMediaPicker`, the logo marks, colours, and icons.
- **Logic** — identity and session handling, translation resolution, URL construction, word matching, version comparison, media matching.

`apps/android/README.md` names Kotlin + Compose as the intended Android stack, and Android is currently served by Capacitor wrappers around the web apps (`.github/workflows/android-wrappers.yml`). When a native Android client happens, every piece of logic in that second list has to exist again. Doing it as a hand port is how two clients drift.

Tiko Write introduces a Kotlin Multiplatform toolchain for `StrokeCore` (see [`2026-07-30-write-stroke-engine-boundary.md`](./2026-07-30-write-stroke-engine-boundary.md)). Once that toolchain exists, the marginal cost of a shared Kotlin logic module is small, and the opportunity is to stop TikoKit from growing more logic rather than to rewrite what is there.

## Decision

Introduce **`TikoKotlinKit`** at `packages/tikokotlinkit/`, a Kotlin Multiplatform module holding Tiko-branded shared logic. Over time it takes logic out of TikoKit so that **TikoKit becomes purely UI**.

Three rules govern the migration:

1. **Additive, always.** `TikoCore.xcframework` is a new dependency *alongside* TikoKit, never a replacement in the same commit. No app loses a working code path before its replacement is proven.
2. **Parity is the gate.** A tier is done when the Kotlin implementation returns identical results to the Swift original across a shared fixture set — not when it compiles.
3. **Proof app first.** Write is the only consumer of each new tier until that tier is proven, per doctrine's *build one proof app before broad migration*. Existing apps migrate one at a time behind their own smoke checklists, and the Swift original is deleted last, per doctrine's *deletion requires proof: inventory, replacement, tests, smoke evidence*.

`TikoKotlinKit` is Tiko-branded and separate from `StrokeCore`, which is product-neutral. They share a Gradle build and ship in one XCFramework, but share no types.

## Measured inventory

Line counts are actual, from `packages/tikokit-ios/Sources/TikoKit/`. The important column is not size but **what blocks portability**.

| Tier | Portable units | Portable lines | Blocker in the rest of the file | When |
|---|---|---|---|---|
| **0** | `TikoImageURL` (whole file) | 40 | — | **v1, with Write** |
| **0** | `TikoWordMatcherKit` (whole file: `TikoLanguageCode`, `TikoMatchType`, `TikoWordMatcherConfig`, `TikoLanguageRules`, `TikoWordMatcher`, `levenshtein`) | 168 | — | **v1** |
| **0** | `TikoMediaItem`, `TikoMediaListResponse`, `TikoMediaMatcher` | ~71 | `TikoMediaClient` is an `actor` over `URLSession` | **v1** |
| **0** | `TikoVersion.isNewer` | ~18 | `TikoUpdateNotice` is `@MainActor ObservableObject` reading `Bundle.main`; `TikoAppStoreLookup` uses `URLSession`; `TikoUserDefaultsStore` uses `UserDefaults` | **v1** |
| **1** | `TikoI18nGenerated` (11,126), `TikoLocales.generated` (68), the resolution logic in `TikoI18n` (1,531) | ~12,700 | `TikoI18n` is `@MainActor ObservableObject` over Combine — the *data* and *resolution* move, the observable wrapper stays Swift | After Write ships |
| **2** | `TikoIdentity` | 739 | `Security` (Keychain) needs `expect`/`actual`; `URLSession` needs Ktor | Last, own ADR |
| **never** | `TikoVoice` (AVFoundation), `TikoSpeech` (AVFoundation), `TikoSentence` (JavaScriptCore), `TikoPopupSheets`, `TikoAppShell`, `TikoCelebrate`, `TikoChoiceGrid`, `TikoTile`, `TikoCard`, `TikoFormFields`, `TikoMediaPicker`, `TikoLogo*`, `TikoCachedRemoteImage`, `TikoColors`, `TikoOpenIcon`, `TikoScreenshotMode` | ~5,800 | SwiftUI, PopupView, AVFoundation, JavaScriptCore | Stays Swift — this **is** the UI layer TikoKit becomes |

**Tier 0 is ~297 portable lines, not ~525.** The four files total 525 lines, but two of them are mostly networking and observable-object plumbing. Counting whole files overstates the work by roughly 40%; counting portable units is the honest measure and the one to plan against.

### Tier 1 is the biggest win, and it is not authentication

`TikoI18nGenerated.swift` is **11,126 lines** — over half of TikoKit — of generated Swift string dictionaries. Moving the translation *data* to a platform-neutral resource with a Kotlin resolver means:

- the generator emits one artifact instead of per-platform Swift;
- a native Android client inherits all 54 languages for free;
- TikoKit loses half its bulk without a single behaviour change.

The risk is low because it is pure data with a mechanically checkable property: every `(key, locale)` pair must resolve to the identical string. That is an exhaustive test, not a sampled one.

### Tier 2 is the one that can break eleven apps

`TikoIdentity.swift` (739 lines) owns Keychain-backed device sessions, magic-link verification, PIN handling, and parent/child mode. It is the single riskiest change available in this repository — not because it is large, but because every shipped app depends on it and a session bug is invisible until a child loses their data.

It needs Ktor plus an `expect`/`actual` secure-storage boundary, and Keychain and EncryptedSharedPreferences differ in ways that matter: access groups, biometric gating, and whether entries survive backup and restore. That boundary must be designed against Tiko's device-first session model **before** Tier 2 starts, in its own ADR, not discovered during it.

## Behavioural traps found while reading the code

These are not hypothetical. They were found reading the Tier 0 sources and each one is a parity test, not a note.

**Locale-aware lowercasing.** `TikoWordMatcher.normalize` calls `lowercased(with: locale)`. Kotlin common's `String.lowercase()` is locale-invariant. For Tiko's six baseline languages (en, nl, fr, es, de, mt) the two agree, but `packages/talk-packs/source/` includes `tr.json` — and Turkish is precisely the case where they diverge: `I` lowercases to dotless `ı` under a Turkish locale and to `i` invariantly. The Kotlin port must either replicate the locale rule explicitly or document that the matcher is locale-invariant, and a parity fixture must cover Turkish either way.

**`CharacterSet` has no Kotlin equivalent.** `normalize` filters on `CharacterSet.punctuationCharacters` and `CharacterSet.symbols`, which are Unicode general categories. Kotlin's `CharCategory` covers the same ground but the category memberships are not guaranteed identical at the edges (currency symbols, modifier letters). The parity fixture set must include a punctuation and symbol torture string, not just words.

**`TikoMediaMatcher.match` iterates a dictionary-derived order.** Building `mediaByName` maps both `name` and `title` to the same item, so a later item silently overwrites an earlier one on collision. Swift `Dictionary` and Kotlin `Map` both make this last-write-wins, but the *input* iteration order must match for the result to match. The port keeps the input as an ordered `List` and must not switch to a `Set`.

None of these would fail a smoke test. All of them would fail a fixture parity test. That is the argument for rule 2 above.

## Scope in v1

Tier 0 only, consumed only by `apps/write/ios`. Concretely:

- Nothing outside `apps/write/ios` acquires a Kotlin dependency.
- The eleven existing iOS apps continue to build with no Gradle involvement at all — verified in CI.
- No Swift file in TikoKit is deleted or modified in v1. The Kotlin implementations sit alongside their Swift originals, and the parity tests pin them together.

This is deliberately unambitious. It proves the toolchain, the framework pipeline, the parity-test harness, and the CI shape end to end, without betting an App Store release on a rewritten identity layer.

## Rejected options

### Move identity first, because that is the valuable bit

Rejected. It is the valuable bit and also the one that can silently break eleven shipped apps. Tier 1 delivers more lines, lower risk, and a bigger reduction in TikoKit, so it earns the toolchain's keep before anything touches sessions.

### Rewrite TikoKit as Kotlin + Compose Multiplatform

Rejected. Doctrine is explicit: *Tiko UI is product-specific. Do not replace it with generic Sil UI or another design system.* The design principles require native SwiftUI behaviour, `TikoPopupSheets` rather than native sheets, and per-platform accessibility. Compose Multiplatform on iOS would trade all of that for code sharing Tiko has not asked for. UI stays SwiftUI; only logic moves.

### Leave TikoKit alone and let Android duplicate the logic later

Rejected. That is the drift this ADR exists to prevent, and the drift would land in identity and translations — the two places where a mismatch is hardest to notice.

### One combined module for the engine and the Tiko logic

Rejected. `StrokeCore` must stay product-neutral to remain independently licensable and extractable, per the chess ADR's naming and extraction guidance. Two Gradle modules, one XCFramework.

## Consequences

- TikoKit stops accumulating logic; new shared logic goes to Kotlin by default.
- Native Android becomes viable incrementally rather than as one large project.
- A JDK is required to build the Write iOS app. Contributors touching only glyph content are shielded, because the pack schema gate is Node.
- Two implementations of Tier 0 logic coexist until the migration completes. This is intentional duplication with a test harness pinning the two together — the alternative is an untested cutover.
- The `wasmJs` target means a future Tiko web client and the admin can share this logic too, which was not previously possible.

## Follow-ups

- Implementation note for Tier 1 before the i18n data moves, covering how the generator emits the neutral artifact and how key parity is asserted exhaustively.
- Separate ADR for Tier 2 covering the `expect`/`actual` secure-storage design against the device-first session model.
- Decide whether `TikoWordMatcher` is locale-invariant or locale-aware, and record it in the matcher's own documentation — the Say app depends on this behaviour today.
