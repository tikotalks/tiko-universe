# Chess App Spec

## Job

A calm, visual-first Chess teaching app for children. Tiko Chess teaches piece movement, captures, check, checkmate, and simple full-game play through guided practice instead of timers, ratings, accounts, or competitive pressure.

Tiko Chess is not the same product as Mazzi Chess. Mazzi Chess is the quiet premium classic Chess app. Tiko Chess is the learning layer for children, caregivers, and accessibility-first use cases.

## Priority

Exploration / future learning app.

Tiko Chess should not interrupt the current core communication app priority order. It belongs after the current simple communication and learning apps are stable enough, and after the chess engine boundary with Mazzi is documented and proven.

## Product note

Tiko Chess should feel like a calm teaching toy, not like a competitive Chess platform.

The child should be able to open the app and learn one small idea immediately:

- how one piece moves;
- which squares are safe;
- how captures work;
- what check means;
- how checkmate happens;
- how to play a simple game against a forgiving local opponent.

The app must work offline for normal use. Any account, cloud sync, or caregiver recovery is optional and must follow the existing Tiko device-first identity doctrine.

## Distinct job

- Cards answers: "What is this called?"
- Type answers: "How do I spell it?"
- Talk answers: "How do I say what I mean?"
- **Chess answers: "How does this game work?"**

Chess is a learning/practice app, not a communication app. It still fits Tiko when it follows the Tiko rules: calm, immediate, visual, child-facing, accessible, and caregiver-configurable.

## Non-goals

- No online multiplayer for v1.
- No rating, ELO, league, ladder, tournament, streak, or daily-pressure system.
- No clock or countdown timer.
- No ads, subscriptions, coins, gems, boosters, or reward economy.
- No Stockfish/GPL engine embedding in Tiko.
- No chess rules implemented directly in Tiko UI code.
- No opening theory for v1.
- No centipawn evaluation UI.
- No adult analysis board for v1.
- No social features.

## Child-facing teaching model

Tiko Chess starts with tiny concepts before full Chess.

### 1. Meet the pieces

Each piece gets a short visual lesson:

- Pawn: moves forward, captures diagonally, can promote later.
- Rook: moves in straight lines.
- Bishop: moves diagonally and stays on one color.
- Knight: jumps in an L shape.
- Queen: moves like rook plus bishop.
- King: moves one square and must stay safe.

The app should avoid long written explanations. It should show the board, animate the move, highlight valid squares, and ask the child to try.

### 2. Tiny board practice

Before full games, Tiko Chess should use small tasks:

- move the rook to the star;
- capture the highlighted piece;
- find all squares the bishop can reach;
- jump the knight to the target;
- move the king to a safe square;
- choose the piece that can reach the target;
- escape check.

The board may start as 4x4 or partial 8x8 setups when useful, but all positions must still be backed by valid chess-state logic rather than custom UI-only rules.

### 3. Legal move discovery

When the child taps a piece, the app shows legal destination squares. Illegal moves should never produce a harsh failure state.

Instead:

- show the attempted direction;
- show the valid path or jump shape;
- explain with one short sentence and/or voice;
- let the child try again immediately.

Examples:

- "The rook moves straight."
- "The bishop stays on this color."
- "The knight jumps in an L shape."
- "The king cannot move into danger."

### 4. Check and checkmate as safety

Check should be introduced as a safety concept before chess terminology.

Visual language:

- king danger glow;
- attacking line from the threatening piece;
- shield marker for safe squares;
- soft haptic/audio warning when a king becomes unsafe;
- no failure sound.

Language ladder:

1. "The king is not safe."
2. "This is check."
3. "Make the king safe."
4. "No safe move is left. This is checkmate."

### 5. Free play

Free play appears after the child understands piece movement and king safety.

Free play rules:

- local opponent only;
- unlimited takeback;
- hint always available when enabled by caregiver;
- no timer;
- no rating;
- save/resume automatically;
- child can continue later.

## Lesson ladder

Suggested v1 progression:

1. Board basics: squares, turns, tap/select/move.
2. Rook movement.
3. Bishop movement.
4. Queen movement.
5. Knight movement.
6. King movement and safe squares.
7. Pawn movement and captures.
8. Capturing.
9. Check.
10. Escaping check.
11. Checkmate in one.
12. First guided game.
13. Free play against the app.

Each lesson should be replayable. Progress unlocks should never block a caregiver from jumping ahead in Parent Mode.

## Engine dependency

Tiko Chess must use the Mazzi Chess Engine boundary documented in `docs/adrs/2026-07-01-tiko-chess-and-mazzi-engine-boundary.md`.

Tiko must not own chess rules. Tiko owns the learning experience, UI, accessibility, TTS, content, settings, progress, and child-facing explanations.

The engine must provide at least:

- valid board state creation;
- legal move generation;
- legal move validation;
- move application;
- undo;
- check detection;
- checkmate detection;
- stalemate detection;
- promotion;
- castling;
- en passant;
- basic draw states needed for app behavior;
- deterministic local opponent moves;
- serializable state for save/resume;
- stable identifiers for pieces and moves;
- attack maps for teaching and king safety;
- hint candidates;
- simple explanation tags for moves and illegal attempts.

The Tiko layer may add child-facing explanation copy, but it should not re-derive chess legality in UI code.

## Engine adapter shape

Tiko should consume a small app-facing adapter rather than raw engine internals.

Conceptual responsibilities:

```txt
TikoChessEngineAdapter
  createLessonPosition(lessonId, stepId)
  createGamePosition(settings)
  getLegalMoves(position, square)
  getAttackMap(position, side)
  validateMove(position, move)
  applyMove(position, move)
  undo(position)
  getGameStatus(position)
  getHint(position, mode)
  chooseOpponentMove(position, difficulty, seed)
  serialize(position)
  restore(serialized)
```

The adapter should return semantic result tags that the Tiko UI can translate:

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
hint.protect-king
hint.safe-square
```

These tags belong in the app/i18n layer, not as hardcoded UI strings.

## Difficulty model

Tiko difficulty should be educational, not rating-based.

Suggested v1 levels:

| Level | Label | Behavior |
| --- | --- | --- |
| 1 | Learning | Opponent makes legal, forgiving moves and misses many captures. |
| 2 | Gentle | Opponent captures obvious free pieces sometimes. |
| 3 | Careful | Opponent protects king and notices simple threats. |
| 4 | Clever | Opponent sees one-move tactics and simple checkmates. |

The engine may internally use deeper levels, search depth, evaluation noise, move filtering, or mistake probability. Tiko should expose child-friendly labels only.

Tests must be deterministic. Any randomness must be seeded.

## Initial API needs

Tiko Chess should be local-first. It does not require a chess backend for v1.

Likely platform needs:

- device identity bootstrap for optional recovery/sync;
- app settings/state through `@tiko/data` or the current Tiko state package;
- local lesson progress;
- local saved free-play game;
- optional cloud backup of progress and settings later;
- generation-api TTS for spoken lesson text where enabled;
- i18n keys under `chess.*`.

No dedicated `chess-api` should be created for v1 unless the product later needs shared cloud progress, generated positions, caregiver dashboards, or cross-device sync that cannot be handled by existing Tiko app-data contracts.

## Web expectations

- Opens without login.
- Uses `@tiko/identity` only for device/session bootstrap when needed.
- Uses Tiko shared app shell and design tokens.
- Uses `@tiko/i18n` with the `chess.*` namespace.
- Uses the same documented engine adapter contract as native clients where practical.
- Keeps chess rules out of Vue components.
- Has mobile-first responsive layout.
- Has no online multiplayer surface.
- Has smoke tests for app load, piece selection, legal move highlighting, illegal move feedback, lesson completion, save/resume, and first free-play move.

## iOS expectations

- Native SwiftUI client.
- Consumes the shared ChessCore/Mazzi Chess Engine adapter as a local dependency or released framework.
- Uses TikoKit for parent mode, child mode, settings, color, typography, audio/haptics, and accessibility patterns.
- Stores session and optional recovery using the shared native identity pattern.
- Stores current game and lesson progress locally first.
- Matches the child-facing interaction model, not every web pixel.
- Provides accessibility labels for pieces, board coordinates, selected pieces, legal squares, unsafe king state, and lesson prompts.

## Android expectations

- Native Jetpack Compose client when Android becomes native.
- Uses the same engine adapter contract.
- Uses bearer/session bundle flow only when optional Tiko identity is enabled.
- Stores current game and lesson progress locally first.
- Matches the child-facing interaction model.

A Capacitor wrapper may be acceptable as a transitional shell only if the web app already meets touch, offline, audio, and accessibility expectations.

## Parent Mode

Parent Mode settings should include:

- lesson progress overview;
- reset lesson progress;
- enable/disable free play;
- choose piece style: classic, friendly, or high-contrast;
- choose board style: calm, high-contrast, coordinates on/off;
- enable/disable legal move hints;
- enable/disable always-on hints;
- enable/disable spoken instructions;
- enable/disable haptics;
- choose difficulty;
- choose left-handed/right-handed layout only if the UI needs it.

Child Mode should not expose destructive settings.

## Accessibility requirements

Tiko Chess must be usable by children who need extra visual clarity or repeated instruction.

Required:

- large tap targets;
- clear selected state;
- clear legal move markers;
- clear illegal attempt explanation;
- reduced motion option;
- high-contrast board option;
- no reliance on color alone;
- optional coordinates;
- VoiceOver labels for board squares and pieces;
- spoken instructions where enabled;
- no fast animations required for comprehension.

## Visual direction

The board must remain readable. Tiko characters may appear in lesson cards, hints, empty states, celebrations, and onboarding, but should not make the board visually noisy.

Piece styles:

- Classic: standard chess symbols/pieces for children who already know chess visuals.
- Friendly: softer Tiko-style pieces with distinct silhouettes.
- High contrast: maximum readability, minimal decoration.

Avoid heavy gradients, complex textures, and decorative elements that interfere with square/piece recognition.

## Content and i18n

All child-facing copy should be short and translation-ready.

Suggested key namespaces:

```txt
chess.app.title
chess.parent.*
chess.lesson.*
chess.piece.*
chess.move.*
chess.hint.*
chess.status.*
chess.accessibility.*
```

Copy should support visual-only use where possible. Lessons must not depend on large text blocks.

## Progress model

V1 local progress can be simple:

```txt
lessonId
stepId
completedAt
attemptCount
hintCount
lastPlayedAt
```

Free-play state:

```txt
position
moveHistory
difficulty
pieceStyle
boardStyle
createdAt
updatedAt
```

Do not store child-sensitive analytics by default. Any future analytics must be opt-in and privacy-reviewed.

## MVP scope

MVP should include:

- app shell and Parent Mode;
- piece movement lessons for all six pieces;
- target-square practice;
- capture practice;
- check lesson;
- escape-check lesson;
- checkmate-in-one intro;
- legal move highlighting;
- illegal move feedback;
- first guided game;
- free play against a gentle local opponent;
- takeback;
- hint;
- local save/resume;
- local progress;
- core accessibility labels;
- smoke tests.

MVP should exclude:

- online play;
- opening lessons;
- advanced tactics;
- ratings;
- leaderboards;
- account-gated sync;
- generated puzzle feeds;
- teacher/classroom dashboards.

## Later roadmap

Possible later phases:

1. More checkmate patterns.
2. Piece-value practice.
3. Fork/pin/skewer as visual concepts.
4. Endgame basics.
5. Caregiver progress dashboard.
6. Generated or curated puzzle packs.
7. Cross-device progress sync.
8. Classroom mode only if it does not compromise child simplicity.

## Testing standard

Required tests before implementation is considered reliable:

- engine adapter contract tests;
- initial lesson position tests;
- legal move tests per piece;
- illegal move explanation tag tests;
- check/checkmate/stalemate tests;
- promotion/castling/en-passant coverage through engine contract;
- save/restore tests;
- deterministic opponent tests;
- lesson progression tests;
- Parent Mode settings tests;
- accessibility label tests;
- web smoke tests;
- native smoke checklist when iOS/Android are implemented.

## Documentation

- Product spec: `docs/apps/chess.md`
- Engine boundary ADR: `docs/adrs/2026-07-01-tiko-chess-and-mazzi-engine-boundary.md`
- Future app docs: `apps/chess/docs/` once implementation begins

## Migration / implementation checklist

- [ ] Mazzi Chess Engine public adapter reviewed.
- [ ] Engine consumption method chosen: git dependency, package artifact, submodule, or extracted repo.
- [ ] Engine license and reuse boundary documented.
- [ ] Product copy/i18n namespace drafted.
- [ ] Lesson ladder converted into content data.
- [ ] Web proof app scoped.
- [ ] iOS proof app scoped.
- [ ] Android approach decided.
- [ ] Local progress model implemented.
- [ ] Save/resume implemented.
- [ ] Smoke tests passing.
- [ ] Native parity check completed when relevant.
