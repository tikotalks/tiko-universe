# Tiko Coloring

## Job

A calm, immediate coloring app for children. It opens with a useful offline
library, supports touch and Apple Pencil, saves automatically, and lets a
caregiver turn a private photo or image into a new coloring page.

Working product name: **Tiko Color**. Repository ID: `coloring`.

## Product principles

- Open and color immediately; no login wall.
- iPad-first native experience.
- No advertisements, subscriptions, coins, timers, streaks or reward economy.
- Large controls, predictable gestures and forgiving tools.
- Bundled pages work entirely offline.
- Imported family images remain private by default.
- The app does not ship third-party character artwork.
- The app does not promote named copyrighted franchises as a feature.

## Main flows

### Choose something to color

The home screen shows:

- the most recent unfinished page;
- visual content packs;
- approved imported pages;
- a Parent Mode action to make a coloring page.

No onboarding carousel or account ceremony is required.

### Color

The canvas is the main interface. Initial tools:

- fill;
- crayon;
- marker;
- eraser;
- color palette;
- undo and redo;
- two-finger pan and zoom.

Apple Pencil uses the active drawing tool. A finger can use the active tool unless
the caregiver enables Pencil-only drawing. Two fingers always navigate.

No-spill mode is enabled by default. A stroke is clipped to the region where it
began. The child may disable it only when the caregiver exposes that option.

### Make a coloring page

Parent Mode can import from Photos or Files, crop the source, and choose:

- detail: simple, normal or detailed;
- line thickness: thin, normal or thick;
- background: keep, simplify or remove.

The source is uploaded privately. `generation-api` runs an asynchronous
`coloring-page` job and returns a validated editable document plus preview. The
caregiver can retry with another detail setting before saving it to the child
library.

## Default content

The first public version should target 60–80 original pages across:

- animals;
- dinosaurs;
- ocean;
- vehicles;
- space;
- nature;
- fantasy;
- everyday objects and places;
- food;
- letters and numbers.

Each pack needs simple, medium and more detailed pages. Bundled assets must be
original, commissioned, generated for Tiko or otherwise licensed for distribution.

## Architecture

```text
SwiftUI iOS app
  native canvas renderer
  Apple Pencil and touch
  TikoKit / Parent Mode / accessibility
             |
             | Kotlin/Native framework
             v
ColoringCore KMP
  document model and migrations
  SVG import and validation
  region hit testing
  fills, strokes, erase and no-spill
  undo and redo
  save, restore and export scene
             |
             | optional HTTPS
             v
media-api / generation-api / Atlas / R2 / D1
```

See `docs/adrs/2026-08-01-coloring-kmp-engine-boundary.md`.

## Local-first storage

Normal coloring does not require an API. A saved package will contain at least:

```text
<document-id>.tikocolor/
  document.json
  source.svg
  preview.webp
```

`ColoringCore` owns `document.json` and migrations. The native client owns sandbox
placement, thumbnails, recent-document indexing and share/export integration.

Cloud recovery and cross-device sync are later features.

## Generation contract draft

Request through the existing generation job surface:

```json
{
  "type": "coloring-page",
  "input": {
    "sourceMediaId": "media_123",
    "detail": "normal",
    "lineWeight": "normal",
    "background": "simplify"
  }
}
```

Successful result:

```json
{
  "documentId": "coloring_456",
  "documentUrl": "https://...",
  "previewUrl": "https://...",
  "sourceMediaId": "media_123",
  "schemaVersion": 1,
  "regionCount": 84,
  "complexity": "normal"
}
```

This is a draft only. The OpenAPI contract and tests must be added before Worker
implementation.

## Privacy

- User imports are private and owner-scoped.
- They are not promoted to the public Tiko media library automatically.
- They are not used for model training or default content generation.
- The caregiver can delete both source and generated result.
- There is no public gallery or social surface in v1.
- Provider retention and deletion behavior must be reviewed before launch.

## Accessibility

Required for the first app:

- large tap targets;
- VoiceOver labels for tools, colors, undo/redo and page controls;
- a reduced-motion path;
- high-contrast outlines;
- no information conveyed only by color;
- optional spoken tool names;
- no timed interaction;
- support for repeated actions without failure sounds.

## MVP

Include:

- KMP engine integrated into a native SwiftUI app;
- offline bundled library;
- fill, crayon, marker and eraser;
- no-spill mode;
- undo and redo;
- autosave and resume;
- pan and zoom;
- PNG export;
- Parent Mode settings;
- core accessibility support.

Exclude until the offline app is strong:

- image conversion;
- public sharing/gallery;
- cloud sync;
- custom brush marketplace;
- rewards, scoring or completion pressure;
- Android UI.

## Implementation order

1. Versioned KMP document and safe SVG importer.
2. Fill hit testing, undo/redo and serialization.
3. Native SwiftUI canvas proof.
4. Brush, eraser and no-spill stroke model.
5. iOS library, autosave, Parent Mode and bundled packs.
6. Content validator and internal repair workflow.
7. Private import and asynchronous conversion.
8. Android Compose client using the same engine.

## Definition of done

- Opens without login.
- Bundled pages work in airplane mode.
- Editable state survives app termination.
- The same serialized fixture behaves identically in JVM, iOS and later Android
  engine tests.
- The UI does not implement region geometry or editing rules independently.
- User imports cannot appear in public media queries.
- Performance remains responsive on the oldest supported iPad for the documented
  complexity limits.
