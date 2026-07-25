# Tiko First

## Job

A calm visual todo app for children. A caregiver builds routines as ordered lists of picture steps (“first toilet, then brush teeth, then get dressed…”); the child works through them one step at a time, crossing each off, with the current step always big, spoken, and unmistakable. First helps kids *do* and *transition* — it communicates “what happens now, and what comes next.”

## Product boundary

- **First is not Sequence.** Sequence is a logic activity: figure out the correct order. First is execution support: the order is given, the child follows and checks it off.
- **First is not Timer.** Steps have no clocks or countdowns in the MVP; pace belongs to the child. (A per-step Timer hand-off is a possible follow-up.)
- Any number of steps (two-step “first/then” up to long routines) — the classic first-then board is just a two-step list.

## Tiko harness

First is a Tiko app and uses the same harness as every other Tiko app. No exclusions.

- `TikoAppShell` (header, settings with shared language/colour pickers, account), `TikoIdentity` no-login bootstrap, Parent Mode / Child Mode per [`docs/flows/shared/user-modes.md`](../flows/shared/user-modes.md).
- `TikoI18n` for all text; the Tiko voice service (Atlas, disk-cached) speaks steps; the shared celebration engine rewards completion.
- Step images from the Tiko media library (routines category exists) with emoji fallback, per the Say pattern.
- A `.first` case in `TikoAppColor` (suggested `#06b6d4`, cyan) registered in `tools/generate-app-configs.mjs`.

## Core child flow

1. Open without login.
2. Choose a routine from large picture tiles (or land directly in the routine a parent pinned as “current”).
3. The current step fills most of the screen: image, short title, spoken aloud once.
4. Upcoming steps show as a small ordered strip; finished steps show ticked and dimmed — visible progress, zero pressure.
5. The child taps the big **done** button (or the step itself): a satisfying tick animation + small celebration, and the next step slides in (the Say card-fly transition) and is spoken.
6. Steps must be crossed off **in order** — that is the point of the app. Tapping a future step just previews it (speaks it), it cannot be completed early.
7. Finishing the last step triggers the big end celebration.

## Interaction principles

- The current step is always obvious: one thing at a time, everything else quiet.
- Replay (re-speak the current step) is always available as an icon-only round button.
- No skipping in Child Mode by default — routines are about completion; a parent can enable a skip button per routine for flexible days.
- Never a buzzer or “wrong”: there is nothing to get wrong.
- Minimal text; pictures and voice carry the meaning.

## Routines and steps

A **routine** has a title, an image/emoji, an ordered list of steps, and settings. A **step** has:

- **Title** — shown under the image.
- **Speak text** — what the app says (defaults to the title).
- **Image** — Tiko media library or upload; emoji fallback.

All content is per language and fully editable — the bundled routines are defaults, not fixed content.

### Bundled default routines

- **Morning** — wake up, toilet, brush teeth, get dressed, breakfast
- **Bedtime** — pyjamas, brush teeth, toilet, story, sleep
- **Leaving the house** — toilet, shoes, coat, bag, go
- **Mealtime** — wash hands, sit down, eat, bring plate
- **First / Then** — a two-step template parents duplicate for quick boards

### Progress and reset

- Ticks persist locally so an interrupted routine resumes where it stopped.
- Per-routine reset behaviour: manual, or automatic **daily reset** (default for Morning/Bedtime) so routines are fresh each day.
- Parent Mode can reset any routine at any time.

## Parent Mode

On the shared Tiko popup sheets:

- Create, edit, duplicate, hide, reorder routines; edit, reorder, add, delete steps (title / speak text / image).
- Defaults are editable per language and resettable, per the family override pattern.
- Per-routine settings: daily reset, allow skip, pin as current.
- Child Mode never sees editing.

## Privacy

- No microphone, no camera, no analytics; completion state stays on device (per account).
- No child identity required.

## Accessibility

- One-big-thing layout, huge touch targets, portrait and landscape, iPad-first.
- Every step spoken; VoiceOver labels everywhere; Dynamic Type on parent-facing screens.
- Reduce Motion: transitions become gentle fades; celebrations use the shared calm path.
- Guided Access friendly — a pinned routine plus Guided Access is a complete transition tool.

## MVP non-goals

- Times, schedules, reminders, or calendar integration
- Per-step timers (possible Timer hand-off later)
- Sync of routines across devices (local-first; standard Tiko data path later)
- Rewards economies (stars/tokens) — celebrations only
- Web or Android

## Definition of done

- Opens without login on the shared harness; Parent/Child Mode per contract.
- Child can pick a routine, hear each step spoken, cross steps off strictly in order, see progress, and get step + finish celebrations.
- Interruptions resume at the right step; daily-reset routines are fresh the next day.
- Parent Mode: full routine/step editing per language on the Tiko sheets, defaults resettable, per-routine settings work; everything survives relaunch, account-scoped.
- Step images resolve from the media library with emoji fallback, offline-capable once seen.
- Unit tests: routine store (overrides, custom, per-language, persistence), progress/reset logic, view-model order enforcement.
- Works on a physical iPad.

## Implementation plan

See [`docs/plans/first-ios-mvp.md`](../plans/first-ios-mvp.md).
