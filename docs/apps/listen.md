# Tiko Listen

## Job

A calm child-facing listening app — the mirror of Say. The app speaks a word; the child picks the matching picture from a small set of cards. Say trains the mouth, Listen trains the ear: receptive vocabulary, the understanding that comes before speaking.

## Product boundary

- **Listen is not Say.** Say asks the child to produce a word (microphone, recognition). Listen asks the child to understand one (no microphone at all). They intentionally share the same categories and cards so families can practise both sides of the same vocabulary.
- **Listen is not Cards.** Cards is expression (tap to say); Listen is comprehension (hear, then find).

## Tiko harness

Listen is a Tiko app and uses the same harness as every other Tiko app. No exclusions.

- `TikoAppShell`, `TikoIdentity` no-login bootstrap, Parent Mode / Child Mode per [`docs/flows/shared/user-modes.md`](../flows/shared/user-modes.md), `TikoI18n` for all text.
- The Tiko voice service (Atlas, disk-cached, synthesizer fallback) speaks the target words; the shared celebration engine rewards a correct pick.
- Card images from the Tiko media library with emoji fallback, cached offline — the Say pipeline.
- A `.listen` case in `TikoAppColor` (suggested `#f59e0b`, amber) registered in `tools/generate-app-configs.mjs`.

**No microphone, no speech recognition, no permissions.** Listen is the family's most frictionless app: install, open, play — fully offline after first use.

## Core child flow

1. Open without login.
2. Choose a visual category (same six as Say: Animals, Food, Vehicles, Body, Colors, Numbers — plus Letters when Say ships it).
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

## MVP non-goals

- Speech recognition of any kind
- Phrases or sentences (single words only)
- Progress tracking, levels, or reports
- Web or Android

## Definition of done

- Opens without login on the shared harness; Parent/Child Mode per contract; zero permission prompts ever.
- Full loop works: word spoken, 2–4 same-category cards, correct pick celebrates and advances, miss = soft tone + dim + re-speak; session completes with the big celebration.
- Calm adaptivity grows/shrinks the card count invisibly; parent can pin it.
- Cards are shared-model with Say: defaults for all six categories in all six languages, editable/hidable/resettable per language, custom cards with library or uploaded images.
- Fully offline after first category visit.
- Unit tests: round generation (distractor same-category rule, no duplicates), adaptivity rules, store overrides, catalog completeness.
- Works on a physical iPad.

## Implementation plan

See [`docs/plans/listen-ios-mvp.md`](../plans/listen-ios-mvp.md).
