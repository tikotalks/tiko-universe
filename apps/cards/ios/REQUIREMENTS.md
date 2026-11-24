# Tiko Cards — Requirements & Test Coverage

Tiko Cards is a picture-communication (AAC) app for young children. Its core job
is to show big **picture cards** grouped into **collections** (Animals, Food,
Drinks, Emotions, …); tapping a card **speaks it aloud** (tap-to-speak). Parents
can create custom collections and cards. **The app must be fully usable without
an account; login is optional.**

This document is the requirements-based test spec that the pilot XCTest / XCUITest
suite verifies. Each requirement notes how it is covered:

- **[unit]** — covered by an XCTest unit test in `Tests/TikoCardsTests.swift`
- **[ui]** — covered by an XCUITest in `UITests/TikoCardsUITests.swift`
- **[manual]** — not yet automated (documented gap)

## Core: picture cards & tap-to-speak

1. On launch the app shows a grid of picture-card **collections**, without any
   account, sign-in, or network being required (built-in defaults render
   offline). **[ui]** (`testAppIsUsableWithoutLogin`) **[unit]**
   (`testDefaultCollectionsContainSpeakableCards`)
2. Tapping a collection opens it and reveals its **picture cards**, and a card is
   tappable (tap-to-speak). **[ui]** (`testCollectionOpensAndCardIsTappable`)
3. Each card carries a display title and a spoken string; the spoken text is
   never empty so tap-to-speak always has something to say. When a custom card is
   added without spoken text, the speech falls back to the title. **[unit]**
   (`testDefaultCollectionsContainSpeakableCards`, `testAddedCardSpeechFallsBackToTitle`)
4. Cards and collections carry a colour that is always renderable — an unknown
   colour falls back to a valid default (orange). **[unit]**
   (`testUnknownColorFallsBackToDefault`, `testCardColorRoundTrips`)

## Built-in content

The default vocabulary is authored once, in `packages/cards-vocabulary`, and
generated into both the content API's seed and `CardsDefaultVocabulary.json`,
the copy bundled in the app. See that package's README.

5. The bundled vocabulary is shown at once on launch, in the app's language,
   before any network answer: 25 root categories ordered by how much a child needs them (Quick words, Feelings, People, Food, Body, Home, Clothes, Toys and play, Animals, Places, School, Health, Transport, Nature, Sensory, Music, Sports, Baby, Colours, Numbers, Letters, Shapes, Celebrations, Stories, Space) and 28
   sub-categories under them (Food alone has ten: Breakfast, Lunch, Dinner,
   Bread, Fruit, Vegetables, Snacks, Sweets, Sauces and extras, Drinks; People
   has Family and Jobs). **[unit]** (`testDefaultVocabularyRootCategoriesInOrder`,
   `testDefaultVocabularyHasSubCategoriesUnderExistingParents`,
   `testFoodIsSplitByMealAndKind`, `testFamilyIsAGroupInsidePeople`,
   `testThereIsASensoryCategory`, `testLoadOfflineDefaultsFollowsTheLanguage`)
   **[ui]** (`testCategoryOpensItsSubCategories`, `testFoodOpensOntoMeals`)
5a. Moving between boards slides the way the move reads: a board one goes
    deeper into arrives from the right, and going back brings the previous board
    in from the left. The header icon is the way back, one board at a time, and
    is named "Back" for VoiceOver. **[ui]** (`testBackReturnsToTheParentBoard`
    — the route; the slide direction itself is **[manual]**)
6. Every default card is pinned to one picture in the media library, chosen by
   a person, and no default card searches for its picture at run time. The
   colour cards have no picture on purpose: the tile colour is the picture.
   Every default category has a tile picture, Colours included. **[unit]**
   (`testEveryDefaultCardIsPinnedToAPictureOrIsAColour`,
   `testEveryDefaultCollectionHasATilePicture`)
6a. Every default card has a Fitzgerald category, and a quick word speaks the
    whole need ("Help" says "I need help"). **[unit]**
    (`testEveryDefaultCardHasAFitzgeraldCategory`, `testQuickWordsSpeakASentence`)
6b. The vocabulary is translated where a person has translated it (Dutch); any
    other language shows the English words rather than guessed ones. **[unit]**
    (`testDefaultVocabularyIsTranslatedIntoDutch`, `testALanguageWithoutATranslationStaysEnglish`)
7. Collections and cards round-trip losslessly through Codable (persistence to
   UserDefaults as JSON). **[unit]** (`testDefaultCollectionsRoundTripJSON`,
   `testCardColorRoundTrips`)

## Custom collections & cards (optional, works offline)

8. A parent can create a custom collection; it is tagged `user_…` and persists
   locally across app launches without an account. **[unit]**
   (`testUserCollectionPersistsAcrossStoreInstances`, `testAddCollectionCreatesUserCollection`)
9. A parent can add a custom card to a collection with a title, spoken text and
   colour. **[unit]** (`testAddCardAppendsToCollection`,
   `testAddedCardSpeechFallsBackToTitle`)
10. Collections can be nested (a collection may have a `parentID`). **[unit]**
    (`testAddNestedCollectionKeepsParent`) **[manual]** (nested navigation UI)
11. Cards and collections can be edited, deleted, reordered, moved and recoloured.
    **[unit]** (store methods) **[manual]** (reorder, move and bulk actions in the UI)

## Finding and laying out cards

11a. A board lays its tiles out in one of two ways, chosen in Settings
     ("Scroll through cards"): swipeable pages (the default — nothing moves
     under a finger), or one grid that scrolls. The tiles are the same either
     way. **[ui]** (`testScrollModeShowsEveryCategoryInOneGrid`)
11b. Search, from the header, finds cards and categories anywhere by a typed
     word: whole words before half-typed ones, case and accents ignored, what a
     card says included, the same thing filed twice shown once. A found card
     speaks; a found category opens, with Back leading up through its parent.
     **[unit]** (`CardsEditingAndSearchTests`, search section) **[ui]**
     (`testSearchFindsACardAndOpensACategory`)

## Editing the default cards

11c. In edit mode every card and category is offered for editing, the default
     ones included; a tap opens its editor, filled in with that item. **[ui]**
     (`testEditModeLetsADefaultCardBeEdited`)
11d. A change to a default card or category (name, spoken text, colour, picture,
     or removing it) is kept on the device, laid over whatever vocabulary is
     current, so it survives a relaunch with no account and no connection, and
     untouched cards keep following the language. A family's own cards keep
     their pictures the same way. Settings offers "Restore defaults" once
     something was changed; it leaves the family's own cards alone. **[unit]**
     (`CardsEditingAndSearchTests`, editing section)

## Content-editing access (admin)

12. Only admin / content-editor roles (or the `canEditContent` capability) may
    edit the shared default content; ordinary users cannot. **[unit]**
    (`testContentEditingAccessAllowsAdminRolesAndCapability`)

## Media / images

13. A default card's picture is loaded straight from the media CDN, resized for
    a tile, with no content API in between; a family's own upload goes through
    the content API. **[unit]** (`testCDNURLUsesImageResizingForTikoUploads`,
    `testImageURLForADefaultCardIsItsPinnedPicture`, `testImageURLForCardUsesContentImageRef`)
14. If media is unreachable, cards remain usable as coloured text tiles (offline
    fallback). **[unit]** (`testDefaultCollectionsContainSpeakableCards`)
    **[manual]** (live network fallback)

## Appearance & accessibility

15. Card size and label size are adjustable; default collections can be hidden;
    animations can be toggled. **[manual]** (settings UI)
16. Child mode opens a card fullscreen instead of the editor on long-press.
    **[manual]**

## Account is OPTIONAL (the App Review fix)

17. The app is fully usable without an account — browsing collections and speaking
    cards works with no login. **[ui]** (`testAppIsUsableWithoutLogin`,
    `testCollectionOpensAndCardIsTappable`)
18. Login is optional and reachable from the account menu (email + one-time code).
    A **"Skip for now"** action dismisses the login popup and returns the user to
    the working app. **[ui]** (`testSkipForNowReturnsToUsableApp`)
19. **REGRESSION (App Review 2.1 — "app reverted back after inputting an email"):**
    the account/login popup must be **non-dismissible** by the keyboard, an
    outside tap, or a drag. Tiko Cards uses the same shared TikoKit login popup as
    Tiko Yes-No. Opening the login popup, tapping the email field and typing an
    email must **NOT** dismiss the card — it stays present so the user can finish
    signing in. **[ui]** (`testLoginPopupSurvivesEmailInput`)

## Profile, lifecycle

20. Optional profile, language selection, colour mode. **[manual]**
21. Logout / account deletion resets local content to defaults. **[manual]**
22. A branded splash screen shows on launch. **[manual]**

---

### Coverage summary

- **Unit (XCTest):** requirements 1, 3, 4, 5, 6, 6a, 6b, 7, 8, 9, 10, 12, 13, 14 —
  the card / collection model, colour + speech fallbacks, the bundled default
  vocabulary (its tree, pinned pictures, Fitzgerald categories and Dutch),
  custom collection/card creation & persistence, admin gating and image
  addresses.
- **UI (XCUITest):** requirements 1, 2, 5, 10, 17, 18, 19 — launch usability
  without an account, opening a collection and tapping a picture card, a
  category opening onto its sub-categories and those onto cards, "Skip for
  now", and the non-dismissible login-popup regression (shared TikoKit login).
- **Manual / not yet automated:** 11, 14 (live), 15, 16, 20, 21, 22.
  These need additional UI coverage in future iterations.
