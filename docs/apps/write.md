# Tiko Write

## Job

A calm child-facing handwriting app. The child sees one letter, number, or shape, watches how it is made, and traces it with a finger or an Apple Pencil. The app teaches **letter formation** — where a stroke starts, which way it travels, which order the strokes come in — because that is the part a child cannot learn from looking at a finished letter.

## Product boundary

Write is not a drawing app: there is no blank canvas, no colour picker, no free doodling. Every mark the child makes is guided by a path. It is not Type (which is text entry for communication) and not Say (spoken word practice) — Write owns the physical act of forming a glyph.

Write also never judges. There is no score, no timer, no star count, no "try again" in red. The child either traces the letter or hasn't yet, and the app is patient either way.

## Tiko harness

Write is a Tiko app and uses the same harness as every other Tiko app. No exclusions. It follows the family's [design principles](../flows/shared/design-principles.md) — icon-only round child controls, no in-app descriptions or explanations, one thing at a time, everything speaks, everything editable, celebration never punishment.

- `TikoAppShell` from `packages/tikokit-ios`: header, settings sheet (with the shared language and colour-mode pickers), account surface, Parent Mode / Child Mode with PIN gate.
- `TikoIdentity` device-first bootstrap: opens without login on a Temporary Account.
- The shared account/mode model from [`user-modes.md`](../flows/shared/user-modes.md).
- `TikoI18n` for all text; the Tiko voice service (Atlas, disk-cached per utterance, synthesizer fallback) for all spoken output.
- The shared celebration engine (`TikoCelebrate`) — randomized variants, card dances, layered chimes, soft retry tone, Reduce Motion path.
- A `.write` case in `TikoAppColor` (green, `#22c55e`) registered in `tools/generate-app-configs.mjs`.

Write adds one engine of its own: **`StrokeCore`**, a product-neutral Kotlin Multiplatform module that owns all tracing geometry and validation. See [`../adrs/2026-07-30-write-stroke-engine-boundary.md`](../adrs/2026-07-30-write-stroke-engine-boundary.md). The engine returns semantic tags; Write owns every word the child hears.

## Core child flow

1. Open without login.
2. Three large groups: **Shapes**, **Numbers**, **Letters**. (Cursive appears as a fourth once its pack ships; a parent can hide any group.)
3. Tap a group to get a grid of glyph tiles, each showing the finished glyph in the Tiko print style.
4. Tap a tile. The trace screen opens with one large glyph.
5. The model draws itself once — a dot travels the first stroke, then the second, in the correct order and direction, with a small pause between strokes.
6. A pulsing start dot marks where the child's finger goes. The child traces.
7. Ink follows the path. Key points tick past under the finger with a light haptic.
8. When every stroke is complete the glyph lifts off its guide, celebrates, and speaks its name.
9. Next and replay are always reachable. A child can never be stuck on a glyph.

### The trace screen

One glyph, centred, as large as the device allows. Behind it: the guide lines (baseline, x-height, cap height) at whatever visibility the parent chose. On it: the faint model glyph, the numbered start dot for the current stroke, and the key points for that stroke.

Nothing else. No progress bar, no letter name in text, no buttons except the round icon-only replay and next.

### What "tracing" means here

The child's finger does not draw freely inside a letter-shaped hole — that is what most tracing apps do, and it teaches nothing about formation. Instead:

- The stroke must be started **near its start point**, not anywhere along the path.
- It must travel in the **correct direction**. Going backwards does not advance the ink.
- It must pass **key points in order** — the corners and curve peaks that make the letter's shape.
- Strokes must be drawn in the **correct order** (configurable, on by default).

When the finger leaves the path, the app does not scold. It applies the parent's chosen recovery: the ink simply stops until the finger comes back (default), or it rewinds to the last key point, or it rewinds to the start of the stroke. There is one soft tone, no voice, no red.

**Ink snapping** is what makes this feel kind rather than fussy. The ink is drawn on the path's centreline, pulled only slightly toward where the finger actually is. A wobbly four-year-old finger produces a clean letter. The child sees success; the engine still knows exactly how accurate the attempt was, and only Parent Mode ever sees that number.

### The five-attempt ladder

Optional, off by default. When on, a glyph is traced five times and each attempt removes help:

| Attempt | Help shown |
|---|---|
| 1 | Full model, key points, start dot |
| 2 | Faint model, key points, start dot |
| 3 | Start dot and key points only |
| 4 | Start dot only |
| 5 | Guide lines only |

Five dots fill in as the child goes. This is a **help ladder, not a score** — the dots never turn red, nothing is lost by re-tracing, and there is no number at the end. Per the design principles: no points, streaks, timers, levels, or leaderboards.

## Handwriting style

v1 ships **one Tiko print style**, and its conventions are a deliberate pedagogical choice rather than a typographic one. This is the thing parents and teachers notice first, so it is stated here explicitly:

- **Single-storey `a`** (`ɑ`), and single-storey `g`. These are the handwritten forms; the two-storey printed forms are typographic and are not what a child writes.
- **No lead-in strokes.** Print letters start clean. Lead-ins belong to cursive-preparatory styles and add a stroke that means nothing until joining begins.
- **Open-top `4`**, **plain `1`** with no base serif or flag, **`7` with no crossbar**.
- **Capital `I` with top and bottom bars**, so it is not confusable with lowercase `l`.
- **`J` and `y`, `g`, `p`, `q` descend** below the baseline; guide lines show the descender line.
- **Stroke order:** top before bottom, left before right, vertical before horizontal.
- **Bowls and circles run counter-clockwise.** A letter bowl (`a`, `c`, `d`, `g`, `o`, `q`) starts at roughly the **1 o'clock** position rather than at 12, which is where a pencil naturally begins the curve and what lets `a` and `d` continue into their stems without a lift. The standalone `circle` shape in the shapes pack starts at 12 o'clock, because it is a shape and not a letter.

Every one of these is data, not code. A school or family that teaches a different convention overrides the pack in the admin, and a future `cursive-latin` pack sits alongside the print one rather than replacing it.

## Content model

Glyphs are authored SVG stroke data, not code and not a font. Each glyph is an ordered list of strokes; each stroke is an SVG path plus optional hand-placed key points. Packs are versioned in git at `packages/write-glyphs`, seeded into D1, served by content-api, and overridable per account in the Tiko admin — the same defaults-plus-overrides model Cards and Sequence use.

v1 packs: `shapes` (~10), `numbers-latin` (10), `print-latin` (52). The engine is script-agnostic, so Japanese kana or Arabic are content work, not engineering work.

Spoken text is deliberately **not** in the glyph pack. Letter names, phonics, and example words live in translations, so 54 languages do not multiply the geometry.

## Voice

Everything speaks, through the shared Tiko voice service. A parent chooses what a glyph says on completion:

- **Letter name** — "bee"
- **Letter sound** (phonics) — "buh"
- **Both** — "bee, buh"
- **Example word** — "bee… ball"
- **Silent**

Numbers speak their number name. Shapes speak their shape name. Nothing is spoken *during* a trace except optional key-point ticks, because a voice mid-stroke breaks concentration.

## Parent Mode

All configuration lives in Parent Mode behind the shared PIN gate, in Tiko popup sheets:

- Which groups and glyphs are enabled
- Difficulty: path tolerance, key point spacing, whether stroke order is enforced, whether the finger may lift between key points
- Off-path recovery: stop in place / back to last key point / back to start
- Model: show or hide, draw speed, repeat automatically
- Guide lines: full / baseline only / off; background colour; high contrast
- Sound mode (above), and whether key-point ticks are on
- Letter size, left-handed mode (start dot and model hand mirrored so the hand does not cover the path)
- Apple Pencil only — ignore finger input, for a child who needs to practise pencil grip

### Progress and replay

Write records each attempt per child: which glyph, which strokes completed, mean and maximum deviation from the path, duration, and how many times the ink reset. Parent Mode can **replay a tracing** — watch the actual path the child's finger took, at real speed.

This is the one place a number appears, and it is for the caregiver, never the child. No child-facing analytics, no report cards, no streak to protect.

## Deliberately not in Write

Drawn from a full read of the three Writing Wizard apps this replaces, these are exclusions rather than backlog:

- **No paywall, no in-app purchases, no ads.** Free.
- **No 16 handwriting fonts.** One good print style, one cursive later. Sixteen is a settings screen, not a feature.
- **No sticker collection, no mini-games.** One calm celebration, one reward beat.
- **No scores, stars-as-points, timers, streaks, or leaderboards.**
- **No MDM remote configuration.** Tiko's child accounts already cover multiple children per device.
- **No separate apps** for cursive and for schools. One app, one price (free), all content.

## Accessibility

VoiceOver labels on every control; the glyph tile announces its letter and the trace screen announces the current stroke. Reduce Motion replaces the travelling model dot with a crossfade between stroke states. Both colour modes, portrait and landscape, iPad-first layouts that work on iPhone. Guide line and background colour options exist for low vision. Guided Access friendly.

Left-handed mode matters more here than in any other Tiko app: a right-handed model hand covers the path for a left-handed child, so the model and start dot mirror.

## Languages

Six minimum (en, nl, fr, es, de, mt) as localized data. Letter names and phonics are per-language content, so adding a language is a translation task. The `print-latin` pack serves every Latin-script language; the geometry does not change.

## Platforms

iOS first and iOS only in v1, matching Say, Sum, and First. Because `StrokeCore` is Kotlin Multiplatform, a future native Android client is a UI project rather than a rewrite, and the admin's stroke authoring preview runs the same engine compiled to WebAssembly — so the app, the admin, and Android can never disagree about what a correct trace is.
