# Tiko Talk — Requirements & Test Coverage

Tiko Talk is an AAC / communication app. Its core job is to let a child **build a
sentence by tapping word tiles** on a board (a word cloud or grid), see the words
appear in a **sentence bar**, and **speak the sentence aloud**. As words are added,
the app **suggests likely next words** and offers sentence **templates** and saved
**phrases**. **The app must be fully usable without an account; login is optional.**
When the backend is unreachable it degrades to a built-in **offline starter pack**.

This document is the requirements-based test spec that the pilot XCTest / XCUITest
suite verifies. Each requirement notes how it is covered:

- **[unit]** — covered by an XCTest unit test in `Tests/TikoTalkTests.swift`
- **[ui]** — covered by an XCUITest in `UITests/TikoTalkUITests.swift`
- **[manual]** — not yet automated (documented gap)

## Core: build & speak a sentence

1. On launch the app shows a word board and a sentence bar, without any account,
   sign-in, or network being required. **[ui]** (`testAppIsUsableWithoutLogin`)
   **[unit]** (`testLoadOfflineFallbackForCapturePopulatesBoard`)
2. Tapping a word tile on the board appends that word to the sentence being built,
   and the word appears in the sentence bar. **[ui]**
   (`testTappingWordTileAddsItToSentenceBar`) **[unit]**
   (`testStoreMutatesSentenceWithoutAPICalls`)
3. The sentence text is the tapped words joined with spaces, in tap order.
   **[unit]** (`testSentenceTextJoinsWords`, `testStoreMutatesSentenceWithoutAPICalls`)
4. A word can be removed from the sentence (double-tap in the bar); removing the
   last word empties the sentence and resets the speak state. **[unit]**
   (`testStoreMutatesSentenceWithoutAPICalls`, `testClearSentenceResetsCompletionState`)
5. The words in the sentence can be reordered without changing which words are
   present. **[unit]** (`testStoreSupportsReorderWithoutChangingWords`)
6. A custom word not in the language pack (e.g. a name typed via search) can be
   added to the sentence; it contributes to the spoken text and keeps the sentence
   speakable, falling back to on-device speech. **[unit]**
   (`testCustomTypedWordJoinsSentenceAndStaysSpeakable`,
   `testCompleteSentenceWithCustomWordUsesNativeFallback`)
7. The sentence can be cleared with a dedicated clear button, resetting the board
   to its starting vocabulary and clearing any completion/audio state. **[unit]**
   (`testClearSentenceResetsCompletionState`) **[manual]** (clear button UI)
8. A speak button reads the completed sentence aloud; the sentence is only
   speakable once it has content. **[unit]** (`testStoreMutatesSentenceWithoutAPICalls`,
   `testCustomTypedWordJoinsSentenceAndStaysSpeakable`) **[manual]** (audio playback)

## Word board, suggestions & prediction

9. After a word is added, the app fetches ranked next-word suggestions and updates
   the strip display and completion state. **[unit]**
   (`testStoreRefreshesSuggestionsAndCompletionStateAfterAddingWord`)
10. The board (`boardWords`) shows ranked suggestions first, then the rest of the
    vocabulary, de-duplicated by id. **[unit]** (`testDeduplicatedByIdKeepsFirstOccurrenceInOrder`,
    board composition exercised in store tests)
11. Vocabulary is organised into categories and can be filtered by category.
    **[unit]** (`testStoreAppliesCategoryFilteringFromVocabulary`)
12. The board can be laid out as a word cloud (default) or a grid, toggled in
    settings. **[manual]** (settings toggle UI)

## Templates & saved phrases

13. Sentence templates pre-fill their known words and leave the open slot for the
    user to complete. **[unit]** (`testStorePrefillsTemplateKnownWordsAndLeavesSlotOpen`)
14. Phrases can be saved and deleted through the API; template/phrase word ids
    resolve to tiles in order, dropping unknown ids. **[unit]**
    (`testStoreSavesAndDeletesPhrasesThroughAPI`, `testMatchingIdsResolvesInOrderAndDropsUnknown`)

## Backend contract & offline

15. The API responses (start / next / vocabulary / phrases) decode into the app's
    models. **[unit]** (`testDecodesSentenceStartResponse`,
    `testDecodesVocabularyAndPhrasesResponses`)
16. When the backend is unreachable, the app degrades to a built-in offline
    starter pack (words, templates, a saved phrase) and stays usable. **[unit]**
    (`testOfflineFallbackContainsSmallStarterPack`,
    `testLoadOfflineFallbackForCapturePopulatesBoard`)
17. Identity is bootstrapped (anonymous session token) before sentence data is
    loaded; the session token — not a client-supplied userId — is the source of
    truth. **[unit]** (`testStoreBootstrapsIdentityBeforeLoadingSentenceData`)
18. The app targets the correct backend environment per build (dev in DEBUG, prod
    in RELEASE). **[unit]** (`testTalkAPIClientUsesBuildEnvironmentDefault`)
19. App metadata (bundle id, app id, title) is correct. **[unit]**
    (`testTalkAppMetadata`)

## Account is OPTIONAL (the App Review fix)

20. The app is fully usable without an account — building and reading a sentence
    works with no login. **[ui]** (`testAppIsUsableWithoutLogin`,
    `testTappingWordTileAddsItToSentenceBar`)
21. Login is optional and reachable from the account menu (email + one-time code).
    A **"Skip for now"** action dismisses the login popup and returns the user to
    the working app. **[ui]** (`testSkipForNowReturnsToUsableApp`)
22. **REGRESSION (App Review 2.1 — "app reverted back after inputting an email"):**
    the account/login popup must be **non-dismissible** by the keyboard, an
    outside tap, or a drag. Opening the login popup, tapping the email field and
    typing an email must **NOT** dismiss the card — it stays present so the user
    can finish signing in. This is the shared TikoKit account popup used by every
    Tiko app. **[ui]** (`testLoginPopupSurvivesEmailInput`)

## Appearance, speech options, lifecycle

23. "Speak word on tap", "Native speech fallback" and word-cloud layout are
    settings toggles. **[manual]**
24. Language is selectable and drives the sentence locale and on-device speech.
    **[manual]**
25. Colour mode (system / light / dark) is selectable. **[manual]**
26. A branded splash screen shows on launch. **[manual]**

---

### Coverage summary

- **Unit (XCTest):** requirements 1–6, 8–11, 13–19 — the sentence/store logic,
  suggestions & prediction, category filtering, templates & phrases, the API
  decode contract, offline fallback, identity bootstrap and app metadata.
- **UI (XCUITest):** requirements 1, 2, 20, 21, 22 — launch usability without an
  account, tapping a word tile into the sentence bar, "Skip for now", and the
  non-dismissible login-popup regression.
- **Manual / not yet automated:** 7 (clear button UI), 8 (audio playback), 12,
  23, 24, 25, 26. These need additional UI coverage in future iterations.

### Notes on app changes for testability

- Added accessibility identifiers only (no behaviour change): `talk.board.word.<id>`
  on board word tiles, `talk.sentence.word.<id>` on sentence-bar words, and
  `talk.sentence.placeholder` on the empty-state text.
- One small logic addition: `TalkStore.loadOfflineFallbackForCapture()` and a
  screenshot-mode branch in `TalkView` so the board is populated deterministically
  and offline during capture / UI tests (previously screenshot mode left the board
  empty). This mirrors the offline scene the app already degrades to.
