# Tiko Design Principles

The non-negotiables every Tiko app follows. Specs reference this document instead of restating it; a proposal that breaks one of these needs an explicit, argued exception in its spec.

## The harness, always

- Every app runs inside `TikoAppShell`: shared header, settings sheet (with the shared language and colour-mode pickers), account surface, splash.
- Every app uses `TikoIdentity` device-first bootstrap: **opens without login** on a Temporary Account. No sign-up walls, ever.
- Every app implements Parent Mode / Child Mode exactly per [`user-modes.md`](./user-modes.md): Parent Mode is the default and owns all configuration; Child Mode shows only the child-facing activity and is exited through the PIN gate.
- All editing, settings, and account surfaces use the shared Tiko popup sheets (`TikoPopupCard`, `TikoFormSheet`, `tikoMediaPickerPopup`) — never native `.sheet`/`Form` styling.
- The family icon vocabulary is shared: `pencil` for edit, `plus` for add, `checkmark` for done, `arrow.counterclockwise` for replay/again, `arrow.forward` for next/skip.

## Child-facing UI

- **Icon-only round buttons.** Child-facing controls are circular, icon-only, minimum 64pt. Labels exist for VoiceOver, not on screen.
- **No descriptions, no explanations.** The child UI never explains itself in text. If a screen needs instructions, the design is wrong. Pictures and voice carry meaning; visible text is at most a single word or title that *is* the content.
- **One thing at a time.** One dominant element per screen (the card, the step, the formula). Everything else is quiet.
- **Minimal text everywhere else too.** Parent-facing copy is one short sentence at most; permission explanations are one line.
- **State is never text or colour alone.** Listening is an animation, progress is ticks and strips, done is a celebration.

## Everything speaks

- All spoken output goes through the Tiko voice service (Atlas voices, per-utterance disk cache, on-device synthesizer fallback). Never raw `AVSpeechSynthesizer` as the primary path.
- Session content is prefetched so apps work **fully offline after first use**.
- Voice and recognition locales always follow the shared `tiko.language` setting; never hardcoded.

## Everything is editable

- Bundled content is **defaults, not fixed content**: editable, hidable, resettable per language, per account. Custom entries sit alongside defaults.
- Edits are stored as overrides so reset-to-default always works and languages never bleed into each other.
- Images come from the Tiko media library (auto-matched per category) with emoji fallback, plus parent-picked library images or photo uploads.

## Celebration, never punishment

- Wins use the shared celebration engine: randomized variants, card dances, layered chimes, light haptics.
- A miss is one soft acknowledgement tone and a calm retry — never a red cross, buzzer, spoken "wrong", or failure animation.
- A child can never be trapped: replay and next/skip are always reachable.
- No points, streaks, timers, levels, or leaderboards. The celebration is the reward.

## Privacy and permissions

- Zero permission prompts unless a feature genuinely requires them, and then only in context after a one-line parent-facing explanation, with a recovery path to Settings on denial.
- No recordings stored, no transcripts kept, no analytics on children, no child identity required to use the app.
- Privacy-sensitive features (microphone) default **off** where the core loop works without them.

## Accessibility, non-negotiable

- VoiceOver labels on everything; Dynamic Type on parent-facing screens; Reduce Motion path for every animation; both colour modes; portrait and landscape; iPad-first layouts that work on iPhone; Guided Access friendly.

## Engineering standards

- Six languages minimum (en, nl, fr, es, de, mt) as localized *data*, not code branches; all UI strings through `TikoI18n`.
- Shared engine modules from TikoKit (`TikoVoice`, `TikoCelebrate`, `TikoSpeechPractice`, `TikoWordMatcher`, shared catalogues) — never app-local copies.
- App colors/configs registered in `tools/generate-app-configs.mjs` (the generator regenerates `TikoAppColor.swift` blocks at build time).
- Screenshot-mode scenes (`TikoScreenshotMode`) and release scaffolding (release config, store copy, CI registration, cloud-signing export options) from day one.
- State machines and stores unit-tested; UI tests for launch and the primary flow; the shared validator and CI green before any release.
- Production definition of done = **submitted to the App Store**, validated on physical devices.
