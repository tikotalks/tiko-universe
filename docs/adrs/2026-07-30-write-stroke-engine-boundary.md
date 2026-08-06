# ADR: Tiko Write and the StrokeCore engine boundary

Date: 2026-07-30

## Status

Accepted.

## Context

Tiko Write is a child-facing handwriting app that teaches letter formation by guided tracing. Spec: [`docs/apps/write.md`](../apps/write.md).

The hard part of Write is not the UI. It is the geometry and the rules: parsing SVG path data, flattening curves to a polyline with an arc-length parameterization, generating and ordering key points, projecting a stream of touch samples onto the path, deciding whether each sample is a valid advance, applying an off-path recovery policy, resolving difficulty per attempt, and scoring the result. That logic is a few thousand lines of pure math and state, and it must behave **identically** everywhere it runs. If iOS and a future Android client disagree about what counts as a completed stroke, the product is broken in a way that is very hard to see and very easy to ship.

Three surfaces need the same answer:

1. **iOS** — the v1 client.
2. **Android** — planned, native, not yet started. `apps/android/README.md` already names Kotlin + Compose as the intended stack.
3. **The Tiko admin** — the stroke authoring UI needs to preview a trace to check that a glyph a human just authored is actually traceable. A preview that uses different geometry than the app is worse than no preview.

[`2026-07-01-tiko-chess-and-mazzi-engine-boundary.md`](./2026-07-01-tiko-chess-and-mazzi-engine-boundary.md) already established how Tiko treats this class of problem: engines are product-neutral Kotlin Multiplatform modules consumed through a narrow adapter API; the engine returns facts and semantic tags; Tiko owns pedagogy, copy, voice, accessibility, and Parent Mode. This ADR applies that precedent to a Tiko-owned engine rather than a borrowed one.

## Decision

Write the tracing engine once, in Kotlin Multiplatform, as a **product-neutral module named `StrokeCore`** that knows nothing about Tiko, handwriting curricula, or children.

`StrokeCore` traces arbitrary paths. It has no opinion about letters. Everything that makes Write a Tiko product for a child — the copy, the voice, the celebration, the guide lines, the parent settings UI, the curriculum ordering — lives in Swift in `apps/write/ios`.

```txt
engines/stroke/            :stroke-core     product-neutral, own LICENSE
packages/tikokotlinkit/    :tikokotlinkit   Tiko shared logic (see the sibling ADR)
                                            framework target exports both
                                            → TikoCore.xcframework
apps/write/ios/                             SwiftUI, TikoKit, all child-facing behaviour
packages/write-glyphs/                      authored glyph packs (content, not engine)
```

Write is also the first consumer of `TikoKotlinKit`; that layer's staging is decided separately in [`2026-07-30-tikokotlinkit-logic-layer.md`](./2026-07-30-tikokotlinkit-logic-layer.md). The two modules share a Gradle build and an XCFramework but no types.

## Implementation gate

The chess ADR requires these questions answered before engine code is added. They are answered here.

### What exact engine path or artifact will Tiko consume?

`packages/tikokotlinkit/build/XCFrameworks/release/TikoCore.xcframework`, built from source in this repository by the root Gradle build. Not a remote artifact, not a git submodule — the engine is Tiko-owned and lives here.

### What is the engine public API name?

`StrokeCore`, in Kotlin package `mt.sil.strokecore`. Public surface:

```kotlin
StrokeCore.packSchemaVersion: Int
StrokeCore.loadPack(json: String): GlyphPack
StrokeCore.newSession(glyph: Glyph, settings: TraceSettings, attempt: Int): TraceSession

GlyphPack.glyph(id: String): Glyph?
Glyph.strokeCount: Int
Glyph.polyline(strokeIndex: Int): FlatPolyline
Glyph.keyPoints(strokeIndex: Int): FlatPolyline

TraceSession.begin(x: Double, y: Double): StrokeEvent
TraceSession.onPoint(x: Double, y: Double, tMs: Long): StrokeEvent
TraceSession.lift(): StrokeEvent
TraceSession.result(): AttemptResult?
```

No public name references Tiko, Write, letters, children, or handwriting. A non-Tiko consumer tracing a maze or a signature would find nothing out of place. Per the chess ADR's naming rule, this is what keeps a later extraction a packaging move rather than a rewrite.

### How is the dependency pinned?

It is built from source in-tree, so it is pinned by the commit. `StrokeCore.engineVersion` is a compiled-in semantic version, bumped when behaviour changes, and it is written into every saved attempt record (below). If `StrokeCore` is ever published standalone, this ADR is superseded by one that specifies tag-based pinning per the chess ADR's dependency preference order.

### How is the engine built for iOS, web, and Android?

| Platform | Target | Consumption |
|---|---|---|
| iOS | `iosArm64`, `iosSimulatorArm64`, `iosX64` | `TikoCore.xcframework`, referenced from `apps/write/ios/Project.yml` with `embed: true`. An XcodeGen pre-build script rebuilds it when stale and fails with a readable `error: JDK 17+ is required to build TikoCore`. |
| Tests | `jvm` | `./gradlew jvmTest` — the real test suite, run in CI on `ubuntu-latest`. |
| Web / admin | `wasmJs` | The admin's stroke authoring preview imports the same engine. Phase 5. |
| Android | `androidTarget` | Added when a native Android client starts. Not configured in v1 — an unused target is maintenance without a consumer. |

**One framework, two modules.** Kotlin/Native embeds its runtime per framework, so shipping `StrokeCore` and `TikoKotlinKit` as two XCFrameworks would double the binary and risk duplicate-class problems. The framework target lives on `:tikokotlinkit` and `export`s `:stroke-core`. This couples the neutral engine to a Tiko-named *artifact* while leaving the *module* neutral; publishing `StrokeCore` standalone later means adding a second framework target, not restructuring.

The XCFramework is **built, never committed**. No multi-megabyte binaries in git.

### What is the saved-state schema?

Attempt records are persisted per child and synced to app-api state. The envelope carries the engine identity so a future engine change cannot silently reinterpret old data:

```json
{
  "engine": "stroke-core",
  "engineVersion": "0.1.0",
  "schemaVersion": 1,
  "attempts": [
    {
      "glyphId": "upper-a",
      "packId": "print-latin",
      "packVersion": 3,
      "attempt": 1,
      "completedStrokes": 3,
      "totalStrokes": 3,
      "meanDeviation": 2.7,
      "maxDeviation": 8.1,
      "resetCount": 1,
      "durationMs": 4820,
      "samples": "<compressed point stream for replay>",
      "createdAt": "2026-07-30T09:12:00Z"
    }
  ]
}
```

`packVersion` is recorded because a glyph can be re-authored in admin; a replay against a changed glyph must be identifiable as such rather than rendered misleadingly. Attempts whose `engineVersion` predates a behaviour change are shown but not compared.

### Which shared fixture tests prove every client sees the same behaviour?

`engines/stroke/src/commonTest/resources/fixtures/` holds recorded point streams paired with their expected tag sequences: a clean trace, a wobbly trace, off-path excursions under each recovery policy, a reversed stroke, an early lift, and wrong stroke order — across each difficulty × attempt combination.

The same fixture files are replayed by three suites:

1. `./gradlew jvmTest` (Kotlin, CI on every push)
2. an XCTest in `apps/write/ios/Tests/` driving the engine through `TikoCoreBridge`
3. a Vitest suite against the `wasmJs` build, once the admin preview exists

Divergence between them is a test failure, not a bug report. This is the mechanism that makes "iOS and Android cannot disagree" a checked property rather than an aspiration.

### Who owns engine releases?

Tiko owns `StrokeCore` outright — unlike the chess engine, there is no second product with a claim on it. Behaviour changes require a `engineVersion` bump and a fixture update in the same commit.

## Interop design

Kotlin/Native's Objective-C bridge handles generics, `Flow`, suspend functions, and primitive arrays badly. Rather than adopt SKIE to paper over that, the API is designed to never need it:

- **No suspend functions and no `Flow`.** The engine is synchronous and pure. Nothing it does is I/O.
- **No generics or sealed generic hierarchies** in the public surface.
- **No collections in the hot path.** `onPoint` takes three primitives and returns one small `data class`. A 240 Hz Pencil stream must not allocate a list per sample.
- **No primitive arrays across the boundary.** `FlatPolyline` exposes `count`, `x(i)`, `y(i)` instead of a `DoubleArray`, which would surface as `KotlinDoubleArray` in Swift. Swift copies it into `[CGPoint]` once per glyph and caches a `CGPath`.

A thin `TikoCoreBridge.swift` wraps the exported Obj-C classes into Swift enums and `CGPoint`s, so app code never sees a `KotlinInt`. Its tests assert that no Kotlin type leaks past the bridge.

**Swift does not parse SVG.** It asks the engine for the flattened polyline and builds its `CGPath` from those points. The path drawn on screen and the path validated against are therefore the same data by construction, not by agreement — which removes an entire category of bug where a letter looks traceable but isn't, or vice versa.

## Semantic tags, not prose

Per the chess ADR, the engine emits tags and the app owns all child-facing language:

```txt
stroke.begin.ok             stroke.begin.wrong-place    stroke.progress
stroke.keypoint             stroke.off-path             stroke.wrong-direction
stroke.lifted-early         stroke.reset                stroke.complete
glyph.stroke-out-of-order   glyph.complete              attempt.finished
```

Write maps these to `write.*` i18n keys, voice utterances, and haptics. This matters more than it looks: the design principles forbid a spoken "wrong", a red cross, or a failure animation. An engine that returned English strings would make that a matter of discipline. An engine that returns `stroke.off-path` makes it a matter of mapping — and the mapping for every failure tag is a soft tone and a silent ink reset.

## Rejected options

### Write the engine in Swift and port to Android later

Rejected. The state machine is where the subtle behaviour lives, and a hand port is where the two clients would drift. The port would also arrive exactly when the Android app is least able to absorb risk. This is the option a Swift-only repo would default into, and it trades a known one-time toolchain cost for an unknown recurring correctness cost.

### Put the engine in TypeScript and wrap it

Rejected. It would suit the admin preview, but a JS runtime in the hot path of a 240 Hz Pencil stream on iOS is the wrong trade, and native Android would inherit the same problem. `TikoSentence.swift` already embeds JavaScriptCore for the Talk realizer; that is a reasonable fit for sentence generation and a poor one for per-sample geometry.

### Two separate XCFrameworks

Rejected. Kotlin/Native embeds its runtime per framework. See "How is the engine built" above.

### Adopt SKIE for ergonomic Swift interop

Rejected for now. SKIE exists to make sealed classes, `Flow`, and default arguments pleasant across the bridge. This API deliberately uses none of them, so SKIE would add a Gradle plugin and a build step to solve a problem the design already avoids. Revisit only if a later tier genuinely needs `Flow`.

### Put curriculum and pedagogy in the engine

Rejected, per the chess ADR's equivalent rejection. Glyph ordering, which letters a child sees first, letter names, phonics, and celebration are Tiko product decisions. The engine returns geometry facts and tags.

## Consequences

- One implementation of tracing correctness, checked by shared fixtures across every client.
- Native Android becomes a UI project rather than a rewrite.
- The admin preview and the app cannot disagree about what a valid trace is.
- **A JDK becomes required to build the Write iOS app.** This is the real cost, and it is new: the repo is npm + XcodeGen + wrangler today. Mitigations: nothing outside `apps/write/ios` acquires a Kotlin dependency in v1, the eleven existing iOS apps continue to build with no Gradle involvement, and glyph content contributors are shielded because the pack schema gate (`tools/check-glyph-packs.mjs`) is Node.
- The engine is structured to be extracted and licensed independently, per the chess ADR's staged extraction path, without forcing that decision now.

## Follow-ups

- Add `androidTarget` when a native Android client starts, not before.
- Revisit standalone publication of `StrokeCore` if a second product needs it, or if the repo-wide open-source decision lands first.
- If `wasmJs` turns out not to serve the admin preview cleanly, that removes one of the three justifications for KMP here and this ADR should be revisited rather than quietly carried.
