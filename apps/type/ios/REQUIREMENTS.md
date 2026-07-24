# Tiko Type — Requirements & Test Coverage

Tiko Type is a talk-to-speak keyboard AAC app. Its core job is to let a child (or
anyone) tap letters on a big on-screen keyboard, build up words as chips in a
sentence bar, and speak them aloud — optionally speaking each letter as it is
tapped. The keyboard layout and key theme are customisable. **The app must be
fully usable without an account; login is optional.**

This document is the requirements-based test spec that the pilot XCTest / XCUITest
suite verifies. Each requirement notes how it is covered:

- **[unit]** — covered by an XCTest unit test in `Tests/TikoTypeTests.swift`
- **[ui]** — covered by an XCUITest in `UITests/TikoTypeUITests.swift`
- **[manual]** — not yet automated (documented gap)

## Core typing & speaking

1. On launch the app shows a big on-screen keyboard and a sentence bar, without
   any account, sign-in, or network being required. **[ui]**
   (`testAppIsUsableWithoutLogin`)
2. Tapping letter keys builds up an in-progress word; the typed text appears in
   the sentence bar. **[unit]** (`testCommittingBuildsWordChips`) **[ui]**
   (`testTypingShowsTextAndSpeaks`)
3. The space key commits the in-progress word as a chip in the sentence; an empty
   in-progress word commits nothing (no empty chips). **[unit]**
   (`testCommittingBuildsWordChips`, `testCommittingEmptyWordIsNoOp`)
4. The speak button speaks the whole sentence — every committed word plus the
   in-progress word, space-separated. **[unit]**
   (`testSpeechStringJoinsWordsAndCurrent`, `testSpeechStringOmitsEmptyCurrent`,
   `testSpeechStringEmptyWhenNothingTyped`) **[ui]** (`testTypingShowsTextAndSpeaks`)
5. Tapping an individual word chip speaks just that word; double-tapping removes
   it. **[manual]** (gesture UI)
6. The sentence can be cleared with a dedicated clear button. **[unit]**
   (clear resets to empty — `testSpeechStringEmptyWhenNothingTyped` documents the
   empty state) **[manual]** (button UI)
7. Backspace deletes the last letter of the in-progress word, or pulls the last
   committed word back into the in-progress word when the current word is empty.
   **[manual]**

## Speak-each-letter

8. When "Speak each letter" is enabled, tapping a key speaks that letter
   immediately and locally (no network). It is off by default. **[manual]**
   (audio output; default is a private `@AppStorage` value)

## Keyboard layouts

9. Multiple keyboard layouts are offered (QWERTY, ABC, AZERTY, QWERTZ, Dvorak),
   each selectable. QWERTY is the default. **[unit]**
   (`testLayoutCatalog`, `testDefaultLayoutIsQwerty`)
10. Selecting a layout by id returns that layout; an unknown id falls back to the
    first (QWERTY) so the keyboard is always renderable. **[unit]**
    (`testLayoutLookupByID`, `testUnknownLayoutFallsBackToDefault`)
11. Every layout carries the full alphabet across its letter rows (no missing or
    duplicate letters). **[unit]** (`testLayoutsCoverAlphabet`)
12. A symbols/numbers layer is available. **[unit]** (`testSymbolsLayerPresent`)

## Key themes

13. Multiple key themes are offered (Classic, Warm, Cool, Colorful, Contrast,
    Ghost), each selectable. Classic is the default. **[unit]**
    (`testThemeCatalog`, `testDefaultThemeIsClassic`)
14. Selecting a theme by its stored raw value returns that theme; an unknown value
    falls back to Classic. **[unit]**
    (`testThemeLookupByRawValue`, `testUnknownThemeFallsBackToClassic`)

## Appearance & options

15. Capital letters, animations and language are configurable; capitals and
    animations default on. **[manual]** (pickers UI; defaults are private
    `@AppStorage` values)
16. Colour mode (system / light / dark) is selectable. **[manual]**

## Persistence & migration

17. The typed sentence persists across launches (word chips saved as JSON). **[manual]**
18. A legacy single-string sentence (`type.text`) migrates into word chips plus a
    trailing in-progress word; a trailing space means the last word is already
    committed. **[unit]** (`testSplitLegacySentence`,
    `testSplitTrailingSpaceHasNoCurrent`, `testSplitEmptyIsEmpty`)

## Account is OPTIONAL (the App Review fix)

19. The app is fully usable without an account — typing and speaking work with no
    login. **[ui]** (`testAppIsUsableWithoutLogin`, `testTypingShowsTextAndSpeaks`)
20. Login is optional and reachable from the account menu (email + one-time code).
    A **"Skip for now"** action dismisses the login popup and returns the user to
    the working app. **[ui]** (`testSkipForNowReturnsToUsableApp`)
21. **REGRESSION (App Review 2.1 — "app reverted back after inputting an email"):**
    the account/login popup must be **non-dismissible** by the keyboard, an
    outside tap, or a drag. Opening the login popup, tapping the email field and
    typing an email must **NOT** dismiss the card — it stays present so the user
    can finish signing in. **[ui]** (`testLoginPopupSurvivesEmailInput`)

## Lifecycle

22. Logout and account deletion reset local content and settings to defaults so a
    new user does not inherit the previous user's typed text or preferences.
    **[manual]**
23. A branded splash screen shows on launch. **[manual]**

---

### Coverage summary

- **Unit (XCTest):** requirements 2, 3, 4, 9, 10, 11, 12, 13, 14, 18 — the
  word-chip building and speech-string rules (`TypeText`), the keyboard-layout
  catalog / lookup / alphabet coverage, the key-theme catalog / lookup, and the
  legacy-sentence migration split.
- **UI (XCUITest):** requirements 1, 19, 20, 21 — launch usability without an
  account, type-then-speak, "Skip for now", and the non-dismissible login-popup
  regression.
- **Manual / not yet automated:** 5, 6 (button UI), 7, 8 (audio / private
  default), 15 (pickers / private defaults), 16, 17, 22, 23. These need
  additional coverage in future iterations.
