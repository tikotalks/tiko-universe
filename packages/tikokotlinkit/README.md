# TikoKotlinKit

Tiko-branded shared logic in Kotlin Multiplatform, and the module that packages
the iOS framework.

Rationale, the migration ladder, and what must never move here:
[`docs/adrs/2026-07-30-tikokotlinkit-logic-layer.md`](../../docs/adrs/2026-07-30-tikokotlinkit-logic-layer.md).

## One-time setup

**A JDK 17+ is required and is not currently installed on this machine.** Gradle
itself cannot run without it, so the wrapper has not been generated yet.

```bash
brew install --cask temurin            # or: brew install openjdk@21
java -version                          # confirm 17 or newer

# Generate the committed wrapper (needs the JDK above; `gradle` is already on
# this machine via Homebrew). Do this once, then always use ./gradlew.
cd /path/to/tiko-universe
gradle wrapper --gradle-version 8.14
```

`gradle/wrapper/gradle-wrapper.jar` and `gradlew` are intended to be committed
once generated — everything after that runs through `./gradlew` so the Gradle
version is pinned for CI and every contributor.

## Commands

```bash
./gradlew jvmTest                        # the real test suite (runs on Linux CI)
./gradlew assembleTikoCoreXCFramework    # → build/XCFrameworks/release/TikoCore.xcframework
./gradlew :stroke-core:jvmTest           # engine only
```

The XCFramework is **built, never committed**. It bundles both `:tikokotlinkit`
and `:stroke-core` into one binary, because Kotlin/Native embeds its runtime per
framework and two frameworks would double the size.

## Status

Tier 0 of the migration. Everything here sits **alongside** its Swift original in
`packages/tikokit-ios` — no Swift file has been deleted or modified, and nothing
outside `apps/write/ios` depends on this module. The parity tests are what pin
the two implementations together.

> **Nothing in this module has been compiled or tested yet**, because no JDK was
> available when it was written. The Gradle files, the dependency versions in
> `gradle/libs.versions.toml`, and the Kotlin sources are all unverified. Run
> `./gradlew jvmTest` after the setup above; expect to fix version numbers and
> possibly `explicitApi()` complaints on the first pass.

## Why parity tests, not just unit tests

A port that "looks right" and returns subtly different results is worse than no
port, because the two implementations diverge silently across platforms. Every
Tier 0 test therefore asserts against **values taken from the Swift original's
behaviour**, including its quirks, rather than against what the function
arguably ought to return.

Three real divergences found while reading the Swift, each now encoded as a test
rather than left as a comment:

| Swift | Kotlin default | Handling |
|---|---|---|
| `split(separator:)` drops empty subsequences | `split()` keeps them | Kotlin filters empties explicitly |
| `Character.isNumber` covers Unicode `Nd` + `Nl` + `No` | `isDigit()` is `Nd` only | Kotlin matches via `CharCategory` |
| `lowercased(with: locale)` is locale-aware | `lowercase()` is locale-invariant | **Open decision** — diverges on Turkish; see the ADR follow-up |
