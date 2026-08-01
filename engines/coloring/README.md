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

## Commands

From `engines/coloring`:

```bash
gradle :coloring-core:jvmTest
gradle :coloring-core:linkDebugFrameworkIosSimulatorArm64
```

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
