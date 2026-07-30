# StrokeCore

Guided path tracing, in Kotlin Multiplatform. Product-neutral: it knows nothing
about Tiko, letters, handwriting, or children.

Given a path and a stream of input points, StrokeCore decides whether the pointer
is following that path — in the right place, travelling the right way, through
the required points, in the required order — and reports what happened as
semantic tags rather than prose.

- Boundary, interop design, and the reasoning:
  [`docs/adrs/2026-07-30-write-stroke-engine-boundary.md`](../../docs/adrs/2026-07-30-write-stroke-engine-boundary.md)
- Glyph pack contract: [`schema/glyph-pack.v1.json`](./schema/glyph-pack.v1.json)
- The product built on it: [`docs/apps/write.md`](../../docs/apps/write.md)

## Status

Phase 0. Only the identity constants exist; the SVG parser, arc-length
parameterization, key point generation, and the tracing state machine are
Phase 1.

Build commands and the one-time JDK setup live in
[`packages/tikokotlinkit/README.md`](../../packages/tikokotlinkit/README.md) —
this module has no framework target of its own, because it is exported through
`TikoCore.xcframework`.

```bash
./gradlew :stroke-core:jvmTest
```

## Why the tests are fixtures, not assertions about geometry

Three clients will run this engine: the iOS app, a future native Android app, and
the Tiko admin's authoring preview compiled to WebAssembly. If any two of them
disagree about what counts as a completed stroke, the product is broken in a way
that is very hard to see and very easy to ship.

So the suite is built on recorded point streams in
`src/commonTest/resources/fixtures/` paired with expected tag sequences — a clean
trace, a wobbly trace, off-path excursions under each recovery policy, a reversed
stroke, an early lift, wrong stroke order. The same files are replayed by the
Kotlin suite, by an XCTest through the Swift bridge, and by a Vitest suite
against the `wasmJs` build. Divergence between them is a test failure, not a bug
report.

## Licensing

MIT, in this directory, independently of the surrounding monorepo. The module
imports nothing from Tiko and its public API names no Tiko concept, so
extracting it later is a packaging move rather than a rewrite.
