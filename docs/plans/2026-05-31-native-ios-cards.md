# Native iOS Cards Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Create `apps/cards/ios` as a native-first AAC-style communication cards app using iOS grids, speech, haptics, Photos, context menus, and offline-first persistence.

**Architecture:** Cards iOS is not a Vue clone. It should preserve the product contract — collections of cards that speak when tapped, with caregiver editing — but use native SwiftUI navigation, adaptive grids, AVFoundation speech, haptics, PhotosUI, and local persistence. Future Cloudflare sync stays behind small Swift clients/protocols.

**Tech Stack:** SwiftUI, Swift 5.9+, iOS 17+, XcodeGen, TikoKit Swift Package, AVFoundation, PhotosUI, Codable file storage or SwiftData later.

---

## Native Product Direction

Use what iOS is good at:

- Tactile card taps with haptics and spring feedback.
- `AVSpeechSynthesizer` for instant offline speech.
- Adaptive `LazyVGrid` layouts for iPhone/iPad, portrait/landscape, Dynamic Type.
- Native `NavigationStack` for collection drill-down.
- Native `.contextMenu` and sheets for caregiver edit actions.
- Native `PhotosPicker` for card images.
- Local-first storage; sync and media upload are explicit future API boundaries.

Do **not** reproduce the web pager or popup layout 1:1. A good native v1 should feel like a fast AAC board, not like a web page in SwiftUI.

## Starting Point

- `apps/cards/web` exists.
- `apps/cards/ios` does not exist yet.
- `packages/tikokit-ios` already exposes shared shell/color primitives and includes `TikoAppColor.cards`.

## Acceptance Criteria

- `apps/cards/ios` exists with XcodeGen project, app entry, initial screen, and smoke test.
- App opens to default collections with no login/setup.
- Tapping a card speaks its phrase and gives haptic/visual feedback.
- Collection navigation is native and swipe-back friendly.
- Caregiver edit mode enables add/edit/delete/duplicate/reorder without exposing those actions by default.
- Card images can be chosen locally via PhotosUI.
- Linux validation and Mac/Xcode validation are reported separately.

---

### Task 1: Scaffold `apps/cards/ios`

**Objective:** Add the product-first native iOS app structure.

**Files:**
- Create: `apps/cards/ios/Project.yml`
- Create: `apps/cards/ios/Sources/TikoCardsApp.swift`
- Create: `apps/cards/ios/Sources/CardsView.swift`
- Create: `apps/cards/ios/Sources/Info.plist`
- Create: `apps/cards/ios/Tests/TikoCardsTests.swift`

**Steps:**
1. Copy the XcodeGen shape from `apps/yes-no/ios/Project.yml`.
2. Rename project/target/scheme to `TikoCards`.
3. Set bundle ID to `mt.tiko.cards`.
4. Add package dependency path `../../../packages/tikokit-ios`.
5. Add `TikoCardsApp` with `CardsView()` in `WindowGroup`.
6. Add initial `CardsView` using `TikoAppShell(appName: "Cards", appIcon: "square.grid.2x2.fill", appColor: .cards)`.
7. Add smoke XCTest.

**Verify:**

```bash
find apps/cards/ios -type f | sort
```

On Mac:

```bash
cd apps/cards/ios
xcodegen generate
xcodebuild test -scheme TikoCards -destination 'platform=iOS Simulator,name=iPhone 15' CODE_SIGNING_ALLOWED=NO
```

**Commit:**

```bash
git add apps/cards/ios
git commit -m "feat(ios): scaffold cards app"
```

---

### Task 2: Add Native Cards Models and Defaults

**Objective:** Define Swift-native collection/card models and seed a small useful default board.

**Files:**
- Create: `apps/cards/ios/Sources/CardsModels.swift`
- Create: `apps/cards/ios/Sources/CardsDefaults.swift`
- Modify: `apps/cards/ios/Tests/TikoCardsTests.swift`

**Model shape:**

```swift
struct CardCollection: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var title: String
    var symbol: String
    var colorHex: Int
    var cards: [CommunicationCard]
}

struct CommunicationCard: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var title: String
    var speech: String
    var symbol: String?
    var imageDataIdentifier: String?
    var colorHex: Int
}
```

**Default strategy:**

Seed a focused native v1 board (`Needs`, `Feelings`, `People`, `Activities`) rather than copying the large web defaults wholesale. Keep every card speakable.

**Test:**

```swift
func testDefaultCollectionsContainSpeakableCards() {
    XCTAssertFalse(defaultCardCollections.isEmpty)
    XCTAssertTrue(defaultCardCollections.allSatisfy { !$0.cards.isEmpty })
    XCTAssertTrue(defaultCardCollections.flatMap(\.cards).allSatisfy { !$0.speech.isEmpty })
}
```

**Commit:** `feat(ios): add cards models and defaults`

---

### Task 3: Build Native Collection/Card Grid

**Objective:** Render native adaptive grids and collection drill-down.

**Files:**
- Create: `apps/cards/ios/Sources/CardCollectionGrid.swift`
- Create: `apps/cards/ios/Sources/CommunicationCardGrid.swift`
- Modify: `apps/cards/ios/Sources/CardsView.swift`

**Implementation notes:**

- Use `NavigationStack` inside shell content.
- Use `LazyVGrid(columns: [GridItem(.adaptive(minimum: 132, maximum: 220), spacing: 16)])`.
- Collection tile shows symbol, title, and card count.
- Card tile shows local image if present, otherwise SF Symbol/text.
- Avoid web-like nested browser panels.

**Verify:** collections fit on iPhone; iPad naturally gets more columns; native back navigation works.

**Commit:** `feat(ios): add native cards grid`

---

### Task 4: Add Speech, Haptics, and Speaking State

**Objective:** Make card taps immediately communicate.

**Files:**
- Create: `apps/cards/ios/Sources/CardsSpeechService.swift`
- Modify: `apps/cards/ios/Sources/CardsView.swift`
- Modify: `apps/cards/ios/Sources/CommunicationCardGrid.swift`

**Implementation notes:**

- Use `AVSpeechSynthesizer` app-local first.
- Stop current speech before starting new speech.
- Fire `UIImpactFeedbackGenerator(style: .medium).impactOccurred()` on tap.
- Track `speakingCardID` briefly for tile pulse animation.
- Add TODO only at Tiko TTS API boundary.

**Commit:** `feat(ios): add speech and haptics to cards`

---

### Task 5: Add Local Persistence Store

**Objective:** Persist customized collections/cards locally.

**Files:**
- Create: `apps/cards/ios/Sources/CardsStore.swift`
- Modify: `apps/cards/ios/Sources/CardsView.swift`
- Modify: `apps/cards/ios/Tests/TikoCardsTests.swift`

**Implementation notes:**

Use a small `@Observable @MainActor final class CardsStore` with JSON file storage in Application Support. Do not introduce sync complexity yet.

Add protocol boundary:

```swift
protocol CardsSyncClient {
    func fetchState() async throws -> [CardCollection]
    func pushState(_ collections: [CardCollection]) async throws
}
```

**Test:** JSON round-trip for default collections.

**Commit:** `feat(ios): persist cards locally`

---

### Task 6: Add Caregiver Edit Mode

**Objective:** Add editing without making the child-facing screen busy.

**Files:**
- Create: `apps/cards/ios/Sources/CardEditorSheet.swift`
- Create: `apps/cards/ios/Sources/CollectionEditorSheet.swift`
- Modify: `apps/cards/ios/Sources/CardsView.swift`
- Modify: `apps/cards/ios/Sources/CommunicationCardGrid.swift`

**Implementation notes:**

- Header action toggles edit mode.
- Context menus only show edit actions when edit mode is active.
- Sheets edit title, speech, symbol/color, and optional image.
- Add/delete should be animated and persisted immediately.

**Commit:** `feat(ios): add cards caregiver edit mode`

---

### Task 7: Add PhotosUI Image Picker

**Objective:** Let caregivers attach local images to cards natively.

**Files:**
- Create: `apps/cards/ios/Sources/CardImageStore.swift`
- Modify: `apps/cards/ios/Sources/CardEditorSheet.swift`
- Modify: `apps/cards/ios/Sources/CardsModels.swift`

**Implementation notes:**

- Use `PhotosPicker(selection:matching:)`.
- Convert selected image to JPEG/PNG data.
- Store image files under Application Support and save identifier on the card.
- Add TODO for future `media-api` upload, but keep local image path working offline.

**Commit:** `feat(ios): add photo picker for cards`

---

### Task 8: Add Native Reorder Management

**Objective:** Use native edit/reorder affordances instead of copying web drag behavior.

**Files:**
- Create: `apps/cards/ios/Sources/ReorderCardsSheet.swift`
- Modify: `apps/cards/ios/Sources/CardsStore.swift`
- Modify: `apps/cards/ios/Sources/CardsView.swift`

**Implementation notes:**

For v1, prefer native `List` reorder sheets with `.onMove` for reliability:

- `Manage Collections`
- `Manage Cards` inside a collection

Persist order after each move.

**Commit:** `feat(ios): add native cards reorder management`

---

### Task 9: Validation and Handoff

**Linux checks:**

```bash
npm run typecheck
npm test -- --run
find apps/cards/ios -type f | sort
```

**Mac checks:**

```bash
cd apps/cards/ios
xcodegen generate
xcodebuild test -scheme TikoCards -destination 'platform=iOS Simulator,name=iPhone 15' CODE_SIGNING_ALLOWED=NO
```

**Manual smoke:**

- App opens to collections.
- Tap collection, tap card, speech/haptics work.
- Edit mode opens native editor sheets.
- Add a card with photo.
- Restart app; local changes persist.
