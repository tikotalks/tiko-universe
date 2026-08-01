# ColoringCore

Product-neutral Kotlin Multiplatform engine for Tiko's coloring app.

`ColoringCore` owns the editable document, safe SVG import, region hit testing,
fill operations, command history, serialization and future stroke logic. Native
apps own rendering, gestures, Apple Pencil or stylus integration, platform
storage, sharing, haptics and the full interface.

## Current targets

- JVM, used for fast host-side engine tests.
- iOS arm64, simulator arm64 and x64 frameworks.
- Android will consume `commonMain` directly when the native Android app starts.

## Supported SVG subset

The first importer accepts closed polygonal paths made from `M`, `L`, `H`, `V`
and `Z` commands. This is intentional. Generated or hand-authored artwork must
be normalized before it becomes an editable coloring document.

The importer rejects scripts, text, images, masks, filters, linked content and
unsupported path commands.

### Contract for artwork

An importable file must satisfy all of the following. Each is enforced, and a
violation raises `IllegalArgumentException` at import rather than producing a
document that behaves strangely later.

| Rule | Why |
|---|---|
| One region per `<path>` — a second `M` in the same `d` is rejected | Two sub-paths appended to one point list weld into a single polygon whose interior spans the gap between them, so a tap on blank canvas fills a shape |
| Every path closes with `Z` and has at least three points | A region has to enclose an area to be fillable |
| Region `id`s are unique | `id` is the stable handle for fills, undo and save data |
| A `viewBox` or numeric `width`/`height` is present and positive | The canvas size is the coordinate space every renderer scales into |

A `viewBox` whose origin is not `0 0` is accepted: geometry is translated into
canvas space at import, so a document's points always lie in
`0,0 .. width,height` regardless of how the artwork was authored.

Mark a decorative path with `data-color-region="false"` to keep it out of the
region list. Use `data-parent-region` and `data-z-index` to describe nesting;
hit testing picks the smallest enclosing region, so inner shapes win.

## Result codes, not exceptions

`fill`, `undo` and `redo` return a `ColoringResult` carrying a
`ColoringResultCode`. Callers are expected to branch on the code — in
particular, a malformed colour comes back as `INVALID_COLOR` rather than
throwing, because an unhandled Kotlin exception crossing into Swift terminates
the host app, and a colour arriving from a picker or a config file is input
rather than a programming error.

Loading is the exception to this: `open` and `fromSvg` do throw, because a
malformed document or unimportable artwork is a build-time or pipeline problem
that should surface loudly.

## Commands

Needs a JDK 21 toolchain. The build pins `jvmToolchain(21)` so a local run
matches CI rather than using whichever JDK happens to launch Gradle; on a Mac
with Homebrew that means:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
```

From `engines/coloring`:

```bash
gradle :coloring-core:jvmTest
gradle :coloring-core:linkDebugFrameworkIosSimulatorArm64
```

Both are verified working on Apple Silicon. `iosX64` cannot be built on an arm64
host — the target is kept for Intel machines and CI, and its skip warning is
silenced in `gradle.properties`.

The generated simulator framework is written below
`coloring-core/build/bin/iosSimulatorArm64/debugFramework/ColoringCore.framework`.

A Gradle wrapper should be added once the repository chooses its shared Gradle
version and CI cache policy. Until then, use a Gradle version supported by the
Kotlin plugin declared in `build.gradle.kts`.

## First public API

```text
ColoringEngine.fromSvg(documentId, svg, title)
ColoringEngine.open(serializedDocument)
snapshot()
snapshotJson()
regionAt(x, y)
fill(x, y, colorHex)
undo()
redo()
serialize()
```

`snapshotJson()` is an intentionally simple Swift bridge while the typed native
adapter is still being proven. It should not become a network contract.
