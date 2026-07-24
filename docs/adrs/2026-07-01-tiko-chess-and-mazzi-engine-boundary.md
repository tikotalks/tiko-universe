# ADR: Tiko Chess and Mazzi Chess Engine boundary

Date: 2026-07-01

## Status

Accepted for planning. Implementation still requires an explicit engine consumption decision before code is added to Tiko.

## Context

Tiko Chess is a proposed child-facing learning app. It teaches Chess through calm visual lessons, guided practice, legal-move feedback, hints, and a forgiving local opponent.

Mazzi already owns the adult/classic Chess product direction. The Mazzi repository currently documents Chess as using a local Kotlin Multiplatform engine in `engines/chess`, with the iOS app consuming the local KMP framework. Mazzi also explicitly avoids Stockfish/GPL engine embedding for its Chess app.

Tiko should not reimplement Chess rules. Chess correctness is too large for UI-layer code, and mistakes in legal move generation, check, checkmate, castling, en passant, promotion, undo, and save/restore would undermine both the learning product and future app reuse.

The question is whether the engine should stay inside the Mazzi repository, move into a separate product-neutral repository, or be copied into Tiko.

## Decision

Do not copy Chess engine code into Tiko.

For the planning phase, keep the engine implementation owned by Mazzi, but treat it as a product-neutral engine module with a stable adapter boundary. Tiko may consume it only through a narrow ChessCore-style API, never through Mazzi app UI code, MazziKit, Mazzi settings, Mazzi assets, or Mazzi product assumptions.

The expected ownership split is:

```txt
Mazzi repo
  engines/chess/             Product-neutral rules, state, AI, serialization, tests
  apps/chess/ios/            Mazzi adult/classic Chess app
  shared/MazziKit/           Mazzi app infrastructure; not consumed by Tiko

Tiko repo
  apps/chess/*               Tiko child learning clients when implemented
  docs/apps/chess.md         Product and learning spec
  TikoKit / Tiko packages     Parent Mode, identity, settings, i18n, TTS, accessibility
```

Tiko Chess consumes chess capability. It does not own chess rules.

## Recommended near-term path

Use a staged approach.

### Stage 1: Keep engine in Mazzi, make the public boundary neutral

Before Tiko implementation begins, confirm that `silvandiepen/mazzi/engines/chess` exposes a small product-neutral module/API. Public names should not require a Tiko client to import Mazzi app concepts.

Acceptable public naming examples:

```txt
ChessCore
ChessEngine
ChessRules
ChessPosition
ChessMove
ChessEngineAdapter
```

Avoid public APIs that force Tiko to know about:

```txt
MazziKit
MazziChessApp
MazziSettings
MazziTheme
MazziStatistics
```

This allows Mazzi to remain the implementation home while Tiko stays brand-clean.

### Stage 2: Consume through a versioned dependency

When Tiko implementation starts, prefer one of these dependency shapes, in order:

1. Released package/artifact from the Mazzi repo.
2. Git dependency pinned to a tag or commit.
3. Git submodule only if package/artifact release is too heavy.
4. Temporary vendored snapshot only for a short proof of concept, with a removal task immediately created.

Do not point Tiko at a moving `main` branch for production code.

### Stage 3: Extract only when reuse friction is real

Move the engine into a separate repository only when at least one of these becomes true:

- Tiko implementation needs the engine on a release cadence that conflicts with Mazzi app work.
- Android/Web packaging from the Mazzi repo becomes awkward.
- More than two product families need the engine.
- Engine issues/PRs/testing need their own lifecycle.
- The public API becomes stable enough to deserve semantic versioning.
- The engine could reasonably become a reusable open/private library independent of Mazzi.

A likely extracted repo shape would be:

```txt
silvandiepen/chess-core
  packages/kmp/              Kotlin Multiplatform ChessCore
  packages/swift/            Swift package or XCFramework wrapper if needed
  packages/ts/               Optional WASM/JS adapter if web needs native engine parity
  docs/                      Engine contract, supported rules, serialization, testing
  tests/                     Shared fixture positions and deterministic engine tests
```

Extraction should be a packaging move, not a rewrite.

## Rejected options

### Copy the engine into Tiko

Rejected.

Copying creates rule drift, duplicated tests, version confusion, and a higher chance that Tiko and Mazzi disagree about legal moves or saved state.

### Put Tiko learning logic in the Mazzi engine

Rejected.

The engine should return chess facts and semantic tags. Tiko owns child-facing pedagogy, visuals, copy, TTS, accessibility, Parent Mode, and lesson progression.

### Let Tiko depend on MazziKit

Rejected.

MazziKit is product infrastructure for Mazzi games. Tiko should use TikoKit/Tiko packages. Only the chess engine boundary is shared.

### Bundle Stockfish in Tiko v1

Rejected.

Tiko Chess needs a teaching engine, not a grandmaster-strength analysis engine. GPL licensing also makes embedding Stockfish inappropriate unless the whole product/legal model is deliberately changed.

## Engine contract required by Tiko

Tiko needs a teaching-oriented adapter over the engine.

Minimum capabilities:

- create valid lesson positions;
- create normal game positions;
- list legal moves for a selected piece;
- validate a move;
- apply a move;
- undo a move;
- serialize/restore a position;
- report check/checkmate/stalemate/basic draw state;
- expose attack maps;
- expose king danger state;
- choose deterministic opponent moves;
- provide hint candidates;
- return explanation tags for illegal moves and important legal moves.

Example semantic tags:

```txt
move.ok
move.illegal.rook-diagonal
move.illegal.bishop-color
move.illegal.blocked-path
move.illegal.king-danger
move.illegal.pawn-direction
move.check
move.checkmate
move.stalemate
hint.capture
hint.safe-square
hint.protect-king
```

Tiko translates these tags into `chess.*` i18n copy and optional TTS. The engine should not ship child-facing prose as its primary API.

## Packaging notes by platform

### iOS

Preferred: consume a tagged KMP-produced framework or Swift Package wrapper. Tiko iOS should use the engine for rules and AI, and use TikoKit for app shell, settings, Parent Mode, accessibility, haptics, sound, persistence, and identity.

### Web

Options:

- Use a TypeScript/WASM adapter only if the KMP engine can be packaged cleanly for web.
- For a proof app, use a small JS bridge only if it consumes the same fixture tests and behavior contract.
- Do not rebuild independent Chess rules in Vue components.

### Android

Preferred: consume the same KMP engine directly when Tiko Android becomes native. If Android remains a Capacitor wrapper temporarily, it follows the web engine path.

## Versioning

Tiko must pin engine consumption to a specific release, tag, or commit. Saved-game serialization must include an engine schema version.

Example saved-game envelope:

```json
{
  "engine": "chess-core",
  "engineVersion": "0.1.0",
  "schemaVersion": 1,
  "position": "...",
  "moveHistory": [],
  "createdAt": "2026-07-01T00:00:00Z",
  "updatedAt": "2026-07-01T00:00:00Z"
}
```

The engine must document compatibility rules before Tiko ships saved games.

## Testing implications

The shared engine should own core Chess correctness tests:

- legal moves;
- illegal moves;
- check;
- checkmate;
- stalemate;
- castling;
- en passant;
- promotion;
- draw states needed by apps;
- undo;
- serialization;
- deterministic opponent behavior.

Tiko should add app-level tests:

- lesson fixtures load;
- legal moves are highlighted;
- illegal move tags map to child-facing copy;
- hints can be requested;
- progress saves;
- free-play game resumes;
- Parent Mode settings affect the UI;
- accessibility labels exist.

## Consequences

- Tiko stays clean and learning-focused.
- Mazzi remains the current implementation owner for Chess engine work.
- The engine is designed so it can be extracted later without a rewrite.
- Both apps can share chess correctness while keeping separate UI, brand, settings, and product behavior.
- A future extraction remains possible, but is not forced before the API is stable.

## Implementation gate

Before adding Tiko Chess app code, answer these questions in an implementation note or follow-up ADR:

- What exact engine path or artifact will Tiko consume?
- What is the engine public API name?
- How is the dependency pinned?
- How is the engine built for iOS, web, and Android?
- What is the saved-state schema?
- Which shared fixture tests prove Tiko and Mazzi see the same chess behavior?
- Who owns engine releases?
