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

5. A catalog of built-in default collections is available offline and matches the
   web Cards categories, in order (Animals, Food, Snacks, Drinks, Colors,
   Emotions, Transport, Body, Numbers, Letters, Actions, People, Places,
   Clothing, Nature). **[unit]** (`testDefaultCollectionsMatchWebCardsCategories`)
6. Each default collection is non-empty and maps to the media categories used to
   hydrate its pictures. **[unit]** (`testDefaultCollectionsContainSpeakableCards`,
   `testMediaCategoryMapMatchesWebCardsContract`)
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
    **[manual]** (editor UI; store methods exercised indirectly)

## Content-editing access (admin)

12. Only admin / content-editor roles (or the `canEditContent` capability) may
    edit the shared default content; ordinary users cannot. **[unit]**
    (`testContentEditingAccessAllowsAdminRolesAndCapability`)

## Media / images

13. Card pictures are fetched from the media service and CDN-resized for tiles;
    Tiko CDN uploads use Cloudflare image resizing. **[unit]**
    (`testCDNURLUsesImageResizingForTikoUploads`)
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

- **Unit (XCTest):** requirements 1, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14 — the
  card / collection model, colour + speech fallbacks, the built-in offline
  catalog, custom collection/card creation & persistence, admin gating and CDN
  image resizing.
- **UI (XCUITest):** requirements 1, 2, 17, 18, 19 — launch usability without an
  account, opening a collection and tapping a picture card, "Skip for now", and
  the non-dismissible login-popup regression (shared TikoKit login).
- **Manual / not yet automated:** 10 (nav UI), 11, 14 (live), 15, 16, 20, 21, 22.
  These need additional UI coverage in future iterations.
