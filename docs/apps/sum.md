# Tiko Sum

## Job

A calm child-facing math-communication app. The child types (or follows) a formula, hears every number and symbol spoken aloud, and answers by choosing from options — never by being told the result. Math becomes another way to practise making and expressing choices.

## Product boundary

Sum is not a calculator and never behaves like one: it does not display computed results. The answer is always a **choice** the child makes (by tapping a tile or saying the number). It is also not Sequence (ordering logic) and not Say (word practice) — Sum owns numbers, operators, and quantities.

## Tiko harness

Sum is a Tiko app and uses the same harness as every other Tiko app. No exclusions. It follows the family's [design principles](../flows/shared/design-principles.md) — icon-only round child controls, no in-app descriptions or explanations, one thing at a time, everything speaks, everything editable, celebration never punishment.

- `TikoAppShell` from `packages/tikokit-ios`: header, settings sheet (with the shared language and colour-mode pickers), account surface, Parent Mode / Child Mode with PIN gate.
- `TikoIdentity` device-first bootstrap: opens without login on a Temporary Account.
- The shared account/mode model from [`docs/flows/shared/user-modes.md`](../flows/shared/user-modes.md).
- `TikoI18n` for all text; the Tiko voice service (Atlas, disk-cached per utterance, synthesizer fallback) for all spoken output — the same engine Say uses.
- The shared celebration engine (randomized variants, card dances, layered chimes, soft retry tone, Reduce Motion path) introduced in Say.
- A `.sum` case in `TikoAppColor` (suggested `#22c55e`, green) registered in `tools/generate-app-configs.mjs`.

## Core child flow

### Free play

1. Open without login.
2. A large friendly keypad: digits 0–9, plus, minus, times, divide, equals, delete. (All four operators are available by default; a parent can hide any the child isn't ready for.)
3. Every key press is spoken instantly in the app language: “three… plus… five…”.
4. Tapping equals speaks the whole formula once (“three plus five equals…”) and presents **three answer tiles**.
5. The child answers by tapping a tile — or, when voice answering is enabled, by saying the number.
6. The right answer triggers the celebration engine and clears for the next formula.
7. A wrong pick gets one soft acknowledgement tone, the formula is spoken again, and one wrong tile fades away. The child is never told “wrong” and never shown the result unchosen.

### Presets (the game)

One tap and the child is playing:

1. **The operator lives in the home header** — `+`, `−`, `×`, `÷`, plus a shuffle tab that mixes them all. Icon-only tabs; the choice is remembered between launches, so the child comes back to whatever they are working on. Only the operators a parent left switched on appear, and a remembered choice cannot outlive the parent switching it off.
2. **Tap a mode and the ten starts** — there is no second question, because its answer is already on screen.
3. Modes are ranges and number families, never operators:
   - **Up to** — `1-5`, `1-10`, `1-20`, `1-50`, `1-100`. Spelled out as a range, so a bare `10` can never be read as "ten sums".
   - **In between** — `10-20`, `20-50`, `50-100`, for the child who has the small numbers already and does not want to start from one every time.
   - **Number families** — the `2`s through the `10`s. One operand is always that number, so the same tile is the 2 times table under `×`, counting on under `+`, counting back under `−`, and sharing under `÷`. The tile borrows the chosen operator and reads `×2` or `+2` accordingly.
4. A range bounds the **answer** for `+` and `−`, and the **factors** for `×` and `÷` — "sums to ten" is about the answer, "tables to five" is about the numbers you multiply, so `5 × 5 = 25` belongs in the `1-5` mode. Where a band is too narrow to fill a varied round (`50-100 ÷` is only `100 ÷ 2` inside the 0–100 cap) the floor quietly opens up rather than dealing the same sum ten times.
5. Sum deals **ten random sums** in that mode, no repeats back to back and nothing trivial (no zero operands or answers, no ×1 or ÷1 outside a family — where `1 × 5` is the first rung of the table and belongs).
6. Each sum lands **one part at a time** — “10”, then “+”, then “20” — spoken as it lands, with a small pop per part. There is no `=` on screen: the answer is the tile the child picks, never something the screen fills in.
7. The three answer tiles are on screen and live from the first beat, so a child who already knows never waits out the voice.
8. A right pick makes that tile dance where it stands while fireworks go off across the **whole window** — the burst is a full-screen overlay, not something boxed around the tile. The tiles then clear and the next sum comes in while the voice says it. The next sum’s voice is prerendered during the current one, so it starts instantly. The hold is deliberately short (0.8s, burst 1.0s): ten celebrations in a row must never become something to wait out.
9. After the tenth sum: an end screen with the celebration and the only two things worth doing next — **Go back** or **Play again**. Play again deals a brand-new ten.
10. Skip is always available; a skipped sum just goes to the next.

There are no points, streaks, timers, or leaderboards — the Tiko promise. Progress is the celebration itself.

### Paths (a family’s own sums)

A parent can also write a fixed run of sums by hand — a named path with its own emoji, in its own section on the home screen. Presets cover the everyday ladder; paths exist for the family that wants a specific set.

## Answer tiles

- Always three options; exactly one correct.
- Distractors are *plausible*, generated by rules: ±1, ±10, digit swap, the other operand, or the result of the sibling operation (3+5 → 2 as “3−5-ish” is never shown negative; fall back to ±2).
- Distractors never repeat the correct value and never go below zero; division formulas only ever have exact results (no remainders anywhere in the app).
- Tiles are spoken when tapped-and-held (audio preview without committing), supporting choice-making the AAC way.
- A wrong pick **stays where it is**: the tile flashes red and wobbles for half a second, then dims and switches itself off. Nothing vanishes from under the child's finger, nothing says “wrong”, and the sum is never re-read at them. When one tile is left standing it pulses.

## Answer modes

How the child answers is a parent setting — **choose, type, or say**:

- **Choose** (default) — three answer tiles, as described above. No permissions, ever.
- **Type** — a digits-only pad appears and the child types the result. A miss clears calmly and re-speaks; after repeated misses the round falls back to two guided tiles so it still ends in success. No permissions.
- **Say** — the tiles stay and the child can simply say the number. Selecting this mode requests microphone and speech-recognition permissions in the parent context (never in the child flow), uses the shared recognition engine (digits and number words in every supported language, on-device preferred, nothing recorded), and tapping always keeps working.

Playback never touches the microphone: speaking uses a plain playback audio session; only the Say mode ever opens a recording session.

## Everything speaks

- Digits, operators, and equals are spoken per key press with the Tiko voices, cached per utterance so the whole keypad works offline after first use.
- Numbers 0–100 are spoken as proper words in every supported language via a per-language number composer — including the languages that invert (“eenentwintig”, “einundzwanzig”), join (“wieħed u għoxrin”), or restructure (“soixante-dix”, “quatre-vingts”). This is real linguistic logic, specified and unit-tested per language, not string concatenation.
- Parent Mode can edit how each operator is spoken per language (“plus” vs “and”, “is” vs “equals”) — the family’s everything-is-editable rule.

## Parent Mode

- Author, edit, hide, reorder, delete **paths**: name, emoji/image, ordered list of formulas.
- Restrict which operators a child is offered — in the home header tabs and on the free-play keypad alike. Plus is never hideable.
- Constrain free play: maximum number (10 / 20 / 100).
- Toggle voice answering.
- All editing uses the shared Tiko popup sheets and is per account, Child Mode never sees it.

## Interaction principles

- Never a red cross, buzzer, or spoken “wrong”; a miss is one soft tone, a half-second red flash on the tile the child actually touched, and then a calmer, smaller choice. The red is feedback on *that tap*, not a verdict on the child, and it is never the only signal — the tile dims and stops responding too.
- Never trapped: Skip always visible, replay (re-speak formula) always available as an icon-only round button.
- Minimal text; the formula and tiles are the interface.
- The loop is quick and never makes the child wait: hear → choose → celebrate → next, with the tiles live from the first beat and the next sum's voice already rendered.

## Privacy

- No microphone unless a parent enables voice answering; never any stored or uploaded audio.
- No answer analytics, no accuracy tracking, no child identity required.

## Accessibility

- Large keys and tiles (min 64pt), portrait and landscape, iPad-first.
- Every control spoken and VoiceOver-labelled; Dynamic Type on parent-facing screens.
- Reduce Motion honoured by the shared celebration engine; the part-by-part reveal, the wrong-pick wobble and the winning dance all fall back to plain fades.
- No colour-only state communication: the red flash on a wrong pick is always accompanied by the wobble, the soft tone and the tile going dim and inert.

## Non-goals

These are product boundaries, not deferrals:

- Progress reports, mastery tracking, or any per-child analytics
- Negative numbers, decimals, fractions, remainders
- Points, streaks, timers, leaderboards
- Web or Android (follow once the iOS product is proven, like the rest of the family)

## Definition of done (production)

Sum is done when it is **live on the App Store**, not when it compiles:

- Opens without login inside the shared harness; Parent/Child Mode per contract; both colour modes; portrait and landscape on iPhone and iPad.
- Free play: keypad speaks every press in the active language (numbers to 100 composed correctly per language); all four operators; equals produces three tiles; correct celebrates; miss = soft tone + red flash + the tile switching itself off; the last tile standing pulses.
- Presets: seventeen modes (five ranges, three bands, nine number families) × any operator (or mixed), each dealing ten valid non-trivial random sums, playable end-to-end with the part-by-part reveal, full-window fireworks on a right answer, and an end screen with Go back / Play again; Skip always works; interruption resumes correctly.
- Parent Mode: paths and operator pronunciations editable per language on the shared Tiko sheets; operator restrictions; free-play cap; answer-mode picker; edits survive relaunch and are account-scoped.
- All three answer modes work: choice tiles, typed answers with the guided-tile fallback, and voice (spoken digits/number words in all six languages, permission flows handled, tapping never blocked). Choice and type modes never trigger a permission prompt.
- Fully offline after first use; zero permission prompts unless voice answering is enabled.
- Complete test suite green: number composer per language, distractor rules, round generator, path store, play state machine, voice-answer paths, UI tests; release validation and CI pass.
- App Store: record, metadata, screenshots (scenes for home/practice/celebrate), privacy labels, age rating, pricing, reviewer notes — submitted for review with automatic release, via the pipeline established for Say.
- Validated on physical iPhone and iPad, including the voice-answer flow with a real child-facing session.

## Implementation plan

See [`docs/plans/sum-ios.md`](../plans/sum-ios.md).
