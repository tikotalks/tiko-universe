# ADR: Coloring engine and native client boundary

Date: 2026-08-01

## Status

Accepted for the first implementation slice.

## Context

Tiko Coloring is an iPad-first coloring app with a bundled offline library and
an optional caregiver flow that converts an uploaded image into a fillable
coloring page. An Android app should later provide the same document behavior
without copying the editing rules.

The iOS experience must remain fully native so it can use SwiftUI, Core Graphics
or Metal, Apple Pencil, Photos, Files, sharing, VoiceOver, haptics and TikoKit.
The shared layer therefore cannot own screens or platform rendering.

## Decision

Create a product-neutral Kotlin Multiplatform module at
`engines/coloring/coloring-core`.

The ownership split is:

```text
ColoringCore KMP
  document schema and migrations
  safe normalized-SVG import
  region graph and hit testing
  fill, stroke and erase operations
  no-spill clipping decisions
  undo and redo
  serialization and restore
  deterministic export scene

Swift iOS app
  SwiftUI screens and navigation
  Core Graphics or Metal renderer
  touch and Apple Pencil collection
  Photos and Files import
  local file placement and thumbnails
  sharing, haptics and accessibility
  TikoKit shell and Parent Mode

Android app later
  Jetpack Compose screens
  Android canvas or GPU renderer
  touch and stylus collection
  Android storage and sharing
```

The engine returns semantic state and commands. It does not return SwiftUI or
Compose views and does not contain child-facing copy.

## Canonical document

The editable source of truth is a versioned `ColoringDocument`, not raw SVG,
PencilKit data or a platform bitmap. SVG is an input and export representation.
Each region has a stable ID so fills survive serialization, app updates and
platform changes.

Saved documents must include a schema version. Breaking changes require an
explicit migration before release.

## Rendering

Rendering remains native. The engine provides normalized geometry and state.
The clients cache native path objects and render the document through one canvas
surface rather than one view per region.

Pointer samples must be batched before crossing the Swift/Kotlin bridge. The
bridge must not be called once per raw coalesced touch event.

## SVG boundary

Clients and generation services must not pass arbitrary SVG directly to a native
renderer. ColoringCore accepts a documented safe subset and rejects scripts,
linked resources, embedded images, text, masks, filters and unknown path
commands.

The initial proof supports closed polygonal paths. Curves will be added only with
shared parser, geometry and fixture coverage.

## AI conversion boundary

AI may simplify an image into line art or segmentation data. A deterministic
post-processing pipeline must create the canonical coloring document:

1. trace contours;
2. close small gaps;
3. remove tiny regions;
4. normalize coordinates and paths;
5. assign stable region IDs;
6. validate with ColoringCore;
7. create preview and editable document assets.

A model-generated SVG is never trusted as the final editable document.

## Packaging

During development, the engine builds a static `ColoringCore.framework` for iOS.
Before the app ships, the repository must choose one repeatable integration:

1. a checked and cached Xcode build phase that builds the local framework; or
2. a versioned XCFramework artifact consumed by the app.

Android will depend directly on the same KMP module.

## Consequences

- Coloring behavior is shared across iOS and Android.
- Native clients retain full control over interaction quality and rendering.
- PencilKit cannot become the saved source of truth.
- SVG support grows deliberately instead of inheriting an unsafe browser-sized
  feature surface.
- The first release can work fully offline with bundled documents.
