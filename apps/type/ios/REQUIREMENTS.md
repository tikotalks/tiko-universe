# Tiko Type — Requirements & Test Coverage

Tiko Type is a talk-to-speak keyboard AAC app. Its core job is to let a child (or
anyone) tap letters on a big on-screen keyboard, build up words as chips in a
sentence bar, and speak them aloud — optionally speaking each letter as it is
tapped. The arrangement, key size and key theme are customisable, and a
full-screen **letterboard** — a copy of the paper board a speech therapist tapes
to a bed rail — is one tap away for anyone a keyboard has become too
fine-grained for. **The app must be
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

## Keyboard arrangements

9. Eight arrangements are offered — **Familiar**, QWERTY, AZERTY, QWERTZ, ЙЦУКЕН,
   Dvorak, ABC and **Large keys** — each selectable. Familiar is the default: it
   is not one arrangement but whichever one this language's typists actually use
   (German → QWERTZ, French → AZERTY, Russian → ЙЦУКЕН, Armenian → ABC, and
   QWERTY for everything else). **[unit]** (`testLayoutCatalog`,
   `testFamiliarFollowsTheLanguage`)
10. Selecting an arrangement by id returns that arrangement; an unknown id falls
    back to Familiar so the keyboard is always renderable and always one this
    language's typists recognise. **[unit]** (`testLayoutLookupByID`,
    `testUnknownLayoutFallsBackToFamiliar`)
11. Every arrangement carries the whole of its language's alphabet, once. A
    language with letters beyond A–Z (German ß, French é, Spanish ñ, Maltese ħ,
    Russian, Armenian) gets them, and gets them where its own keyboard puts them;
    a language Tiko ships no alphabet for still gets a full Latin keyboard.
    Asking for an arrangement from another script (Armenian QWERTY, English
    ЙЦУКЕН) falls back to the alphabetical grid rather than guessing. **[unit]**
    (`testEveryArrangementCarriesItsWholeAlphabet`,
    `testAlphabetsCarryTheirOwnLetters`, `testUnknownLanguageGetsTheLatinKeyboard`,
    `testCanonicalRowsCarryALanguagesExtraLetters`,
    `testALanguageKeepsItsOwnRowsForItsOwnArrangement`,
    `testAnotherScriptsArrangementIsRefused`)
12. Digits and marks are reachable from every arrangement on every screen size:
    an iPad gets a numeral row above the letters, a phone (and every grid
    arrangement) gets the `123` key. The numbers page is exactly as wide as the
    letters it replaces. **[unit]** (`testEveryArrangementReachesDigits`,
    `testNumeralRowOnlyOnTheWiderScreen`, `testNumbersPageIsAsWideAsTheLetters`)
    **[ui]** (`testSymbolsLayerTypesDigits`)

## The keyboard is a rectangle

The arrangement engine is pure data — rows of keys measured in *columns*, never
in points — so what a keyboard looks like can be asserted instead of screenshot.

24. Every row of one keyboard is exactly as wide as every other, insets included,
    for every arrangement in every language on both screen sizes and on both the
    letters and the numbers page. A row that does not add up is a row that trails
    off the edge. **[unit]** (`testEveryArrangementIsARectangle`)
25. The staggered arrangements are staggered: the home row sits half a key in,
    shift is on the left of the bottom letter row and backspace on its right.
    **[unit]** (`testStaggeredArrangementsAreOffset`)
26. No arrangement grows wider than about ten columns on a phone; the ones that
    need more room move their punctuation behind `123` instead. **[unit]**
    (`testPhoneArrangementsStayNarrow`)
27. Every key identifier is unique within its row, and every pressable key
    carries an accessibility label — an unlabelled key is silent under VoiceOver,
    and a keyboard is traversed key by key. The identifiers UI tests tap
    (`key-h`, `key-space`, `key-backspace`, `key-symbols-toggle`) are stable and
    independent of capitalisation. **[unit]**
    (`testKeyIdentifiersAreUniqueWithinARow`, `testEveryPressableKeyIsLabelled`,
    `testKeyIdentifiersAreStable`, `testALetterKeyTypesTheSmallLetter`,
    `testAGapDoesNothing`)
28. Spare columns are spent where the row's alignment says, rows split as evenly
    as they divide, an undividable width produces no column rather than a
    hairline one, and no key is ever drawn below the 44pt touch floor. **[unit]**
    (`testRowSpendsItsSlackWhereAlignmentSays`, `testBalancedSplitEvensTheRows`,
    `testUnitWidthIsZeroWhenThereIsNothingToDivide`,
    `testKeysNeverFallBelowTheTouchFloor`)

## The letterboard

A copy of the paper board a speech therapist tapes to a bed rail — reached from
the keyboard screen and from the board's own Keyboard control, so it stays
available in child mode. It shares Type's keys and grid and nothing else: its
shape and its sizes are its own.

29. The board is five letters across with a rail of marks down the right —
    backspace at the top, then `!`, `?` and `.` — and the last letter row takes
    the rail's column rather than stranding one letter underneath. **[unit]**
    (`testLetterboardIsFiveAcrossWithARail`)
30. DONE runs across the foot of the board and is the speak key: there is no
    separate Speak button, because that is what DONE means on a letterboard.
    **[unit]** (`testLetterboardEndsInDone`)
31. The board is a rectangle in every language and on both its pages, carries the
    whole alphabet, and keeps its shape behind the Numbers control. **[unit]**
    (`testLetterboardIsARectangleAndCarriesEveryAlphabet`,
    `testLetterboardNumbersPageKeepsTheShape`)
32. A longer alphabet grows the board rather than shrinking its letters — the
    rail runs out and the extra rows are letters. **[unit]**
    (`testALongerAlphabetTakesMoreRows`)
33. The board's letters are drawn far larger than a keyboard's, in capitals, and
    the whole alphabet is on screen at once — a letterboard somebody scrolls has
    taken away the letter they were reaching for. **[unit]**
    (`testTheBoardShoutsLouderThanTheKeyboard`) **[manual]** (the on-screen fit
    is decided by the height the board is given at run time)
34. Every letter is spoken as it is pressed, without a setting to find: on a
    board the letter *is* the utterance. Clear empties the spelled line and the
    Keyboard control returns to typing. **[manual]** (audio / view state)

## Key themes

13. Multiple key themes are offered (Classic, Warm, Cool, Colorful, Contrast,
    Ghost), each selectable. Classic is the default. The theme is the only place
    a keyboard colour is decided — the grid decides where a key goes, never what
    colour it is — so every theme answers for every key role (letter, control,
    the letterboard's DONE, and the pressed state) in both light and dark.
    **[unit]** (`testThemeCatalog`, `testEveryThemeResolvesEveryRoleInBothSchemes`)
14. Selecting a theme by its stored raw value returns that theme; an unknown value
    falls back to Classic. **[unit]** (`testThemeLookupByRawValue`)

## Appearance & options

15. Capital letters, animations and language are configurable; capitals and
    animations default on. Key size is a four-step preset (Small, Standard,
    Large, Extra large, standard by default) that really does draw a taller key
    and never falls below the touch floor; Large keys is fewer keys per row, not
    only bigger ones. **[unit]** (`testKeySizesGrowTheKeys`,
    `testLargeKeysAreFewerPerRow`) **[manual]** (pickers UI)
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

- **Unit (XCTest):** requirements 2, 3, 4, 9–15, 18, 24–34 — the word-chip
  building and speech-string rules (`TypeText`), the arrangement engine
  (`KeyboardAlphabet`, `KeyboardLayoutDefinition`, `KeyGeometry`, `KeyRowLayout`),
  the letterboard (`LetterboardBoard`), the key-size presets, the key-theme
  catalogue and role coverage, and the legacy-sentence migration split.
- **UI (XCUITest):** requirements 1, 3, 6, 7, 12, 19, 20, 21 — launch usability
  without an account, type-then-speak, space/backspace/clear, the symbols layer,
  "Skip for now", and the non-dismissible login-popup regression.
- **Manual / not yet automated:** 5, 8, 16, 17, 22, 23, and the run-time halves
  of 33 and 34 (audio output, gestures, private `@AppStorage` defaults, and the
  on-screen fit of the board). These need additional coverage in future
  iterations.
