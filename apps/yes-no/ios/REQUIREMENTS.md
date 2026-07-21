# Tiko Yes-No — Requirements & Test Coverage

Tiko Yes-No is a simple AAC / communication app for young children. Its core job
is to give a child two big, spoken **YES / NO** answer buttons (tap-to-speak),
with optional richer answer sets, typed sentences and custom tiles. **The app must
be fully usable without an account; login is optional.**

This document is the requirements-based test spec that the pilot XCTest / XCUITest
suite verifies. Each requirement notes how it is covered:

- **[unit]** — covered by an XCTest unit test in `Tests/TikoYesNoTests.swift`
- **[ui]** — covered by an XCUITest in `UITests/TikoYesNoUITests.swift`
- **[manual]** — not yet automated (documented gap)

## Core answering

1. On launch the app shows two big answer buttons, **YES** and **NO**, without any
   account, sign-in, or network being required. **[ui]** (`testAppIsUsableWithoutLogin`)
2. The default answer set is the built-in "Yes / No" set: exactly two answers,
   "Yes" (green) and "No" (red). **[unit]** (`testDefaultSetsContainYesNo`) **[ui]**
3. Tapping an answer speaks its spoken text aloud when speech is enabled
   (tap-to-speak). The spoken text defaults to the answer's label. **[unit]**
   (`testTileSpeechDefaultsToLabel`, `testAnswerChoiceMapsSpeech`)
4. Each answer carries a display label and a distinct spoken string that may
   differ from the label. **[unit]** (`testTileDistinctLabelAndSpeech`)
5. Answers can be localized: a tile exposes per-language label/speech
   translations (e.g. Dutch "Ja"/"Nee"), falling back to the base label. **[unit]**
   (`testBuiltInTranslationsPresent`)

## Typed sentence

6. The user can type a custom sentence and have it spoken via the speak button. **[manual]**
7. The sentence can be cleared with a dedicated clear button. **[manual]**

## Answer sets & customisation

8. Multiple built-in answer sets are available (Yes / No, Basic needs, Quick
   choices), each ordered and selectable. **[unit]** (`testBuiltInAnswerSetsCatalog`)
9. Custom answer sets and tiles can be created, edited and deleted, each with a
   colour, optional image/icon and custom spoken text. **[unit]** (model:
   `testTileEncodesAndDecodesRoundTrip`, `testAnswerSetInitAndOrdering`) **[manual]** (editor UI)
10. Answer style is configurable (tiles / buttons / compact / text). **[unit]**
    (`testChoiceStyleCatalog`)
11. Label size is adjustable. **[manual]**

## History, language, appearance

12. Recently used sentences are kept in a question history and can be re-selected. **[manual]**
13. Language is selectable and drives localisation. **[unit]** (translation model) **[manual]** (picker UI)
14. Colour mode (system / light / dark) is selectable. **[manual]**

## Account is OPTIONAL (the App Review fix)

15. The app is fully usable without an account — YES / NO answering works with no
    login. **[ui]** (`testAppIsUsableWithoutLogin`)
16. Login is optional and reachable from the account menu (email + one-time code).
    A **"Skip for now"** action dismisses the login popup and returns the user to
    the working app. **[ui]** (`testSkipForNowReturnsToUsableApp`)
17. **REGRESSION (App Review 2.1 — "app reverted back after inputting an email"):**
    the account/login popup must be **non-dismissible** by the keyboard, an
    outside tap, or a drag. Opening the login popup, tapping the email field and
    typing an email must **NOT** dismiss the card — it stays present so the user
    can finish signing in. **[ui]** (`testLoginPopupSurvivesEmailInput`)

## Profile, modes, lifecycle

18. Optional profile: display name, avatar and favourite colour. **[manual]**
19. Child mode / parent PIN gating. **[manual]**
20. Logout and account deletion reset local content and settings to defaults so a
    new user does not inherit the previous user's state. **[manual]**
21. Selection gives haptic feedback and a colour flash. **[manual]**
22. A branded splash screen shows on launch. **[manual]**

---

### Coverage summary

- **Unit (XCTest):** requirements 2, 3, 4, 5, 8, 9 (model), 10, 13 (model) — the
  answer model, speech/label content, translations and the built-in catalog.
- **UI (XCUITest):** requirements 1, 15, 16, 17 — launch usability without an
  account, "Skip for now", and the non-dismissible login-popup regression.
- **Manual / not yet automated:** 6, 7, 9 (editor UI), 11, 12, 13 (UI), 14, 18,
  19, 20, 21, 22. These need additional UI coverage in future iterations.
