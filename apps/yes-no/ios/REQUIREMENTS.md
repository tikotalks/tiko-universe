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
   (`testDefaultBoardRendersYesAndNo`)
3. Tapping an answer speaks its spoken text aloud when speech is enabled
   (tap-to-speak). The spoken text defaults to the answer's label. **[unit]**
   (`testTileSpeechDefaultsToLabel`, `testAnswerChoiceMapsSpeech`) **[ui]**
   (`testTappingNoAnswerKeepsAppUsable` — answering stays usable, no login/crash)
4. Each answer carries a display label and a distinct spoken string that may
   differ from the label. **[unit]** (`testTileDistinctLabelAndSpeech`)
5. Answers can be localized: a tile exposes per-language label/speech
   translations (e.g. Dutch "Ja"/"Nee"), falling back to the base label. **[unit]**
   (`testBuiltInTranslationsPresent`)

## The question

6. The board shows the question as a bar. Tapping it opens the question panel,
   where a question is typed. **Return** sets it and closes the keyboard and the
   panel; a tap beside the panel does the same. There is no cancel: every way
   out leaves with what is in the field. **[ui]**
   (`testReturnSetsTheQuestionAndClosesThePanel`,
   `testTapBesideThePanelSetsTheQuestion`)
7. The field can be cleared with a dedicated clear button. An emptied field falls
   back to the starter question. **[ui]** (`testQuestionFieldCanBeCleared`)
23. The question can be said instead of typed: the microphone in the panel puts
    what it hears in the field and stops when the speaker pauses. The microphone
    is not offered for a language with no recognizer, and a refused permission
    is explained with a way to Settings. **[unit]** (`YesNoDictationTests`)
    **[manual]** (a real microphone, on a device)
24. The speak button reads the question aloud. Tapping it while it is preparing
    or playing stops that attempt; tapping again starts a new one. It is never
    disabled for being busy. **[unit]** (TikoKit
    `testSupersededSpeakLeavesTheNewerCallAlone`) **[manual]** (the button)

## Answer sets & customisation

8. Multiple built-in answer sets are available (Yes / No, Basic needs, Quick
   choices), each ordered and selectable. **[unit]** (`testBuiltInAnswerSetsCatalog`)
9. Custom answer sets and tiles can be created, edited and deleted, each with a
   colour, optional image/icon and custom spoken text. **[unit]** (model:
   `testTileEncodesAndDecodesRoundTrip`, `testAnswerSetInitAndOrdering`) **[manual]** (editor UI)
10. Answer style is configurable (tiles / buttons / compact / text). **[unit]**
    (`testChoiceStyleCatalog`) **[ui]** (`testSettingsShowsAnswerOptions` — the
    "Answer style" settings row). NB: the answer-style *picker* itself opens a
    second popup on top of settings; that stacked-popup flow is intentionally not
    UI-tested (unstable under the automation harness — see the note in the UI test
    file), the style catalog being fully unit-covered.
11. Label size is adjustable. **[ui]** (`testSettingsShowsAnswerOptions` — the
    "Label size" settings row)

## History, language, appearance

12. Questions that were set or asked are kept (the latest twelve) and offered in
    the question panel as earlier questions; picking one sets it. Typing narrows
    the list. **[ui]** (`testQuestionPanelStartsWithoutEarlierQuestions`,
    `testAskedQuestionCanBePickedAgain`)
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

- **Unit (XCTest):** requirements 2, 3, 4, 5, 8, 9 (model), 10, 13 (model), 23 —
  the answer model, speech/label content, translations, the built-in catalog,
  the Codable round-trips, the app config, the speech-service surface and
  dictation against a scripted speech stack.
- **UI (XCUITest):** requirements 1, 2, 3, 6, 7, 10, 11, 12, 15, 16, 17 — launch
  usability without an account, the two-answer board rendering, answering staying
  usable, the question panel (Return, a tap beside it, clear, earlier questions),
  the settings answer options, "Skip for now", and the non-dismissible
  login-popup regression.
- **Manual / not yet automated:** 9 (full editor UI), 13 (language picker UI), 14,
  18, 19, 20, 21, 22, 23 (a real microphone), 24 (the button itself), and the
  answer-style *picker* popup (stacked-popup flow — unstable under the harness;
  catalog is unit-covered). These need additional coverage in future iterations.
