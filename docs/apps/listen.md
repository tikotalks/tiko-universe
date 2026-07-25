# Tiko Listen

## Job

A calm child-facing listening app — the mirror of Say. The app speaks a word; the child picks the matching picture from a small set of cards. Say trains the mouth, Listen trains the ear: receptive vocabulary, the understanding that comes before speaking.

## Product boundary

- **Listen is not Say.** Say asks the child to produce a word (microphone, recognition). Listen asks the child to understand one (no microphone at all). They intentionally share the same categories and cards so families can practise both sides of the same vocabulary.
- **Listen is not Cards.** Cards is expression (tap to say); Listen is comprehension (hear, then find).

## Tiko harness

Listen is a Tiko app and uses the same harness as every other Tiko app. No exclusions. It follows the family's [design principles](../flows/shared/design-principles.md) — icon-only round child controls, no in-app descriptions or explanations, one thing at a time, everything speaks, everything editable, celebration never punishment.

- `TikoAppShell`, `TikoIdentity` no-login bootstrap, Parent Mode / Child Mode per [`docs/flows/shared/user-modes.md`](../flows/shared/user-modes.md), `TikoI18n` for all text.
- The Tiko voice service (Atlas, disk-cached, synthesizer fallback) speaks the target words; the shared celebration engine rewards a correct pick.
- Card images from the Tiko media library with emoji fallback, cached offline — the Say pipeline.
- A `.listen` case in `TikoAppColor` (suggested `#f59e0b`, amber) registered in `tools/generate-app-configs.mjs`.

**No microphone, no speech recognition, no permissions.** Listen is the family's most frictionless app: install, open, play — fully offline after first use.

## Core child flow

1. Open without login.
2. Choose a visual category — the full shared vocabulary at launch: Animals, Food, Vehicles, Body, Colors, Numbers, and Letters (the Say Letters work lands in the shared catalogue as part of Listen's launch train).
3. The app speaks a word: “dog”.
4. Two to four picture cards appear; exactly one matches.
5. The child taps a card. The right one triggers the celebration engine (the card dances, its emoji rains); the next word follows automatically.
6. A wrong tap gets one soft acknowledgement tone, the word is spoken again, and the tapped card gently dims. The child keeps choosing — never a red cross, never trapped.
7. A session covers the category's words (shuffled); finishing celebrates big, then Restart / Choose category.

## Calm adaptivity

Difficulty adjusts invisibly inside a session — never as levels or scores:

- Start with **two** cards.
- After a few first-tap successes, grow to **three**, then **four**.
- After a miss, quietly drop one card for the next word.
- Parent Mode can pin the card count instead (fixed 2, 3, or 4) for children who need consistency.

## Cards and content

Listen uses the same card model and default catalogue as Say — title, speak text, image, per language — minus the listen-for field (nothing is recognised). The catalogue is shared engineering-wise (see plan) so a card fixed or added in one place serves both apps.

Everything is editable in Parent Mode, per the family rule:

- Edit any default card's title, speak text, and image; hide it; reset it per language.
- Add custom cards (family photos are especially powerful here: “find Grandma”).
- Reorder cards; per-account, per-language, survives relaunch.

Distractor cards are drawn from the same category (a “dog” round shows other animals, never a bus) so the choice is meaningful, not obvious.

## Interaction principles

- Replay (hear the word again) is always available as an icon-only round button; a small next/skip button too.
- Minimal text: the spoken word carries the task; the only visible text is card titles, and a parent can hide titles per category for pure picture listening.
- The loop is quick: hear → find → celebrate → next.
- Wrong is never punished — one soft tone, a dimmed card, the word again.

## Privacy

- No microphone, no audio recorded, no analytics, no child identity required.
- Fully offline after first use (voice + image caches).

## Accessibility

- Large cards (2–4 max means they stay big), portrait and landscape, iPad-first.
- VoiceOver: cards labelled with their titles; the target word repeatable at any time.
- Reduce Motion via the shared celebration engine; no colour-only state communication.
- Optional hidden titles never remove VoiceOver labels.

## Non-goals

These are product boundaries, not deferrals:

- Speech recognition of any kind (that is Say's job — Listen stays permission-free)
- Phrases or sentences (single words only)
- Progress tracking, levels, or reports
- Web or Android (after the iOS product is proven, like the rest of the family)

## Definition of done (production)

Listen is done when it is **live on the App Store**, not when it compiles:

- Opens without login on the shared harness; Parent/Child Mode per contract; both colour modes; portrait and landscape on iPhone and iPad; **zero permission prompts ever**.
- Full loop works in all six languages: word spoken, 2–4 same-category cards, correct pick celebrates and advances, miss = soft tone + dim + re-speak; session completes with the big celebration; interruption resumes.
- All seven categories at launch (including Letters via the shared catalogue), every card localised in all six languages.
- Calm adaptivity grows/shrinks the card count invisibly; parent can pin it; hide-titles per category works with VoiceOver labels intact.
- Cards are shared-model with Say: defaults editable/hidable/resettable per language, custom cards with library or uploaded family photos, account-scoped, relaunch-persistent.
- Fully offline after first category visit (voice + image caches).
- Complete test suite green (round builder, adaptivity, store, session view model, catalog completeness, UI tests); release validation and CI pass; VoiceOver/Dynamic Type/Reduce Motion audited.
- App Store: record, metadata, screenshots, privacy labels (nothing collected beyond the shared identity), age rating, pricing, reviewer notes — submitted for review with automatic release via the Say pipeline.
- Validated on physical iPhone and iPad.

## Implementation plan

See [`docs/plans/listen-ios.md`](../plans/listen-ios.md).
