# Tiko Talk iOS Implementation Plan

> Historical implementation plan for the native Tiko Talk iOS slice. The first implementation has landed; keep this as the product/engineering plan record and remaining validation checklist.

**Goal:** Build a native-first SwiftUI iOS client for Tiko Talk under `apps/talk/ios` that consumes the shared Sentence API contract, works immediately without a login wall, and preserves Talk’s backend-owned sentence intelligence doctrine.

**Architecture:** The iOS app is a tactile native sentence-builder: SwiftUI shell, large word tiles, sentence strip, haptics, native sheets, local offline fallback, and app-local AVFoundation speech fallback. The app must not duplicate grammar, language-pack, or suggestion intelligence; all smart sentence behavior comes from `workers/sentence-api` through stable HTTPS JSON contracts, with a minimal bundled fallback pack only for offline/no-network startup.

**Tech Stack:** SwiftUI, Swift 5.9+, iOS 17+, XcodeGen, `packages/tikokit-ios`, Swift Concurrency, `URLSession`, AVFoundation, XCTest.

---

## Native Product Direction

Talk is not a 1:1 port of `apps/talk/web`. Preserve the product contract, not the web layout.

Native affordances to use:

- `TikoAppShell` from `packages/tikokit-ios` for shared header, settings, account/setup, language, and color-mode surfaces.
- Large tappable SwiftUI word tiles with spring press feedback and `UIImpactFeedbackGenerator`.
- Horizontal sentence strip with removable word chips; drag/reorder can be a second slice after tap-add/remove is stable.
- Native bottom sheets or popups for templates, categories, saved phrases, and app-specific settings.
- `AVSpeechSynthesizer` as immediate offline speech fallback; shared `sentence-api /complete` audio URL playback layers in before v1 acceptance.
- Local bundled minimal English fallback for startup/offline only. It must be visibly modeled as fallback data and never become app-owned grammar logic.

Non-negotiables:

- No grammar rules, POS transition logic, or language-pack intelligence in Swift runtime beyond decoding/rendering API responses.
- No child-facing LLM calls.
- No password/login wall.
- No Supabase-era assumptions.
- Native identity uses TikoKit/Ankore device-first session storage when wired, not web cookies.
- Production readiness requires macOS/Xcode validation; VPS-only source checks are not enough.

---

## Current Context / Assumptions

Observed source state on 2026-06-06:

- Active repo: `/home/hermes/workspace/tiko-universe`.
- Current checkout during planning was `feat/atlas-gateway-implementation`; implementation should start from `origin/development` in a clean worktree/branch unless Sil explicitly asks for direct `development` commits.
- Existing Talk web/docs/API paths:
  - `apps/talk/web`
  - `apps/talk/docs/DOCTRINE.md`
  - `apps/talk/docs/SPEC.md`
  - `apps/talk/docs/ARCHITECTURE.md`
  - `packages/talk-types/src/index.ts`
  - `workers/sentence-api/src/index.ts`
- Existing native examples:
  - `apps/yes-no/ios/Project.yml`
  - `apps/type/ios/Project.yml`
  - `apps/cards/ios/Project.yml`
  - `apps/radio/ios/Project.yml`
  - `apps/timer/ios/Project.yml`
- Existing TikoKit native package:
  - `packages/tikokit-ios/Sources/TikoKit/TikoAppShell.swift`
  - `packages/tikokit-ios/Sources/TikoKit/TikoPopupSheets.swift`
  - `packages/tikokit-ios/Sources/TikoKit/TikoIdentity.swift`
  - `packages/tikokit-ios/Sources/TikoKit/TikoAppColor.swift`

Important existing gap:

- `TikoAppColor` currently has no `.talk` case. Add it in TikoKit first and use that canonical app color in Talk iOS.

---

## Proposed File Layout

Create:

```text
apps/talk/ios/
  Project.yml
  Sources/
    TikoTalkApp.swift
    TalkView.swift
    TalkModels.swift
    TalkAPIClient.swift
    TalkStore.swift
    TalkOfflineFallback.swift
    TalkSpeechService.swift
    TalkAudioPlayer.swift
    TalkWordTileView.swift
    TalkSentenceStripView.swift
    TalkTemplateSheet.swift
    TalkSavedPhrasesSheet.swift
    Info.plist
  Tests/
    TikoTalkTests.swift
```

Modify:

```text
packages/tikokit-ios/Sources/TikoKit/TikoAppColor.swift
packages/tikokit-ios/Tests/TikoKitTests/TikoKitTests.swift
docs/apps/talk.md
apps/talk/docs/IMPLEMENTATION.md
```

Optional after the first scaffold is green:

```text
.github/workflows/ios.yml or existing iOS validation workflow
```

Only touch workflow files if Talk needs to be added to an existing iOS matrix.

---

## Step-by-Step Plan

### Task 1: Start from a clean development worktree

**Objective:** Avoid mixing Talk iOS planning/implementation with unrelated Atlas or parallel agent work.

**Files:** none.

**Steps:**

1. Inspect branch and dirtiness:

   ```bash
   cd /home/hermes/workspace/tiko-universe
   git status --short --branch
   git fetch origin
   ```

2. If the shared checkout is dirty or on a feature branch, create an isolated worktree:

   ```bash
   git worktree add /tmp/tiko-talk-ios origin/development
   cd /tmp/tiko-talk-ios
   git switch -c feat/talk-ios
   ```

3. If the shared checkout is already clean on `development`, use a branch there:

   ```bash
   git switch development
   git pull --rebase origin development
   git switch -c feat/talk-ios
   ```

**Verification:**

```bash
git status --short --branch
```

Expected: branch is `feat/talk-ios`, based on `origin/development`, with no unrelated dirty files.

**Commit:** none.

---

### Task 2: Add the canonical Talk app color to TikoKit

**Objective:** Make Talk use shared native app-color infrastructure instead of hardcoded app-local colors.

**Files:**

- Modify: `packages/tikokit-ios/Sources/TikoKit/TikoAppColor.swift`
- Modify: `packages/tikokit-ios/Tests/TikoKitTests/TikoKitTests.swift`

**Implementation notes:**

Add a `.talk` case to `TikoAppColor` and choose a distinct Talk palette. Suggested starting color: teal-blue, separate from Cards orange, Type blue, Sequence teal, and Tiko pink.

Example shape:

```swift
public enum TikoAppColor: String, CaseIterable, Sendable {
    case yesNo = "yes-no"
    case type
    case cards
    case sequence
    case timer
    case radio
    case talk
    case tiko
}
```

```swift
case .talk:
    TikoAppPalette(label: "Talk", primary: Color(hex: 0x2f80ed), dark: Color(hex: 0x123f7a))
```

If `0x2f80ed` is too close to Type after visual review, switch to a more sentence/communication-specific purple-blue or green-blue before release. The important part is one canonical shared token.

**Test requirement:**

Add/extend a TikoKit unit test that asserts:

- `.talk` exists in `TikoAppColor.allCases`.
- `.talk.palette.label == "Talk"`.
- primary/dark are distinct from at least `.type` and `.sequence` labels/colors if existing tests expose comparable values.

**Verification:**

```bash
git diff --check
```

On Mac, later:

```bash
cd packages/tikokit-ios
swift test
```

**Commit:**

```bash
git add packages/tikokit-ios/Sources/TikoKit/TikoAppColor.swift packages/tikokit-ios/Tests/TikoKitTests/TikoKitTests.swift
git commit -m "feat: add talk color to native TikoKit"
```

---

### Task 3: Scaffold the Talk iOS XcodeGen project

**Objective:** Add the minimal source-reviewable native app project with TikoKit dependency and XCTest target.

**Files:**

- Create: `apps/talk/ios/Project.yml`
- Create: `apps/talk/ios/Sources/Info.plist`
- Create: `apps/talk/ios/Sources/TikoTalkApp.swift`
- Create: `apps/talk/ios/Sources/TalkView.swift`
- Create: `apps/talk/ios/Tests/TikoTalkTests.swift`

**Project.yml shape:**

Mirror the existing app projects:

```yaml
name: TikoTalk
options:
  bundleIdPrefix: mt.tiko
  deploymentTarget:
    iOS: "17.0"
settings:
  base:
    DEVELOPMENT_TEAM: ""
packages:
  TikoKit:
    path: ../../../packages/tikokit-ios
targets:
  TikoTalk:
    type: application
    platform: iOS
    sources:
      - Sources
    dependencies:
      - package: TikoKit
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: mt.tiko.talk
        INFOPLIST_FILE: Sources/Info.plist
  TikoTalkTests:
    type: bundle.unit-test
    platform: iOS
    sources:
      - Tests
    dependencies:
      - target: TikoTalk
```

**Info.plist minimum keys:**

Include standard bundle keys so simulator install does not fail with missing bundle ID:

```xml
<key>CFBundleIdentifier</key>
<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
<key>CFBundleExecutable</key>
<string>$(EXECUTABLE_NAME)</string>
<key>CFBundleName</key>
<string>Talk</string>
<key>CFBundleDisplayName</key>
<string>Talk</string>
<key>UILaunchScreen</key>
<dict/>
```

**Initial app shape:**

`TikoTalkApp.swift` should only boot `TalkView()`.

`TalkView.swift` should use:

```swift
import SwiftUI
import TikoKit

struct TalkView: View {
    var body: some View {
        TikoAppShell(
            appName: "Talk",
            appIcon: "message",
            appColor: .talk,
            settingsContent: {
                TikoSettingsSection(title: "Talk") {
                    Text("Sentence building settings will live here.")
                }
            }
        ) {
            Text("Talk")
        }
    }
}
```

Adjust `appIcon` to an existing accepted TikoKit/OpenIcon/SF-symbol-compatible value after inspecting `TikoAppShell`’s current API. Do not invent unsupported enum cases if the shell expects a strict type.

**Test requirement:**

`TikoTalkTests.swift` should include at least one smoke test that can run in XCTest without UI hosting complexity:

```swift
import XCTest
@testable import TikoTalk

final class TikoTalkTests: XCTestCase {
    func testBundleIdentifierIsTalk() {
        XCTAssertEqual(Bundle.main.bundleIdentifier, "mt.tiko.talk")
    }
}
```

If `Bundle.main.bundleIdentifier` is not reliable in unit-test host context, test a small app constant instead, e.g. `TalkAppMetadata.bundleIdentifier`.

**Verification:**

Linux/VPS:

```bash
git diff --check
find apps/talk/ios -type f | sort
```

Mac:

```bash
cd apps/talk/ios
xcodegen generate
xcodebuild test -scheme TikoTalk -destination 'platform=iOS Simulator,name=iPhone 15' CODE_SIGNING_ALLOWED=NO
```

**Commit:**

```bash
git add apps/talk/ios
git commit -m "feat: scaffold talk ios app"
```

---

### Task 4: Port Talk API DTOs into native Swift models

**Objective:** Create Codable Swift models that mirror `packages/talk-types/src/index.ts` response/request shapes without importing web packages.

**Files:**

- Create: `apps/talk/ios/Sources/TalkModels.swift`
- Modify: `apps/talk/ios/Tests/TikoTalkTests.swift`

**Models to include first:**

- `TalkWordTile`
- `TalkCategory`
- `TalkTemplate`
- `TalkSavedPhrase`
- `TalkStripState`
- `TalkInitialStripState` or a unified optional-word form if simpler
- `TalkSentenceStartResponse`
- `TalkSentenceNextRequest`
- `TalkSentenceNextResponse`
- `TalkSentenceCompleteRequest`
- `TalkSentenceCompleteResponse`

Example:

```swift
struct TalkWordTile: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let text: String
    let pos: String
    let category: String
    let icon: String?
    let image: String?
}
```

Use `String` for IDs/POS/category initially. Do not over-model enums for POS in v1 because the backend owns vocabulary and new packs may introduce values.

**Test requirement:**

Add decoder tests with representative JSON from `packages/talk-types` contract:

```swift
func testDecodesSentenceStartResponse() throws {
    let json = #"""
    {
      "templates": [{"id":"want","pattern":"I want ___","category":"needs","icon":"speech","slotCount":1}],
      "initialCategories": [{"id":"pronouns","label":"Pronouns","icon":"user","posTypes":["pronoun"],"wordCount":1}],
      "initialWords": [{"id":"i","text":"I","pos":"pronoun","category":"pronouns","icon":"user"}],
      "savedPhrases": [],
      "stripState": {"words": [], "validNext": ["pronoun"], "canComplete": false}
    }
    """.data(using: .utf8)!

    let decoded = try JSONDecoder().decode(TalkSentenceStartResponse.self, from: json)
    XCTAssertEqual(decoded.initialWords.first?.text, "I")
}
```

**Verification:**

Mac:

```bash
cd apps/talk/ios
xcodegen generate
xcodebuild test -scheme TikoTalk -destination 'platform=iOS Simulator,name=iPhone 15' CODE_SIGNING_ALLOWED=NO
```

**Commit:**

```bash
git add apps/talk/ios/Sources/TalkModels.swift apps/talk/ios/Tests/TikoTalkTests.swift
git commit -m "feat: add talk ios api models"
```

---

### Task 5: Add the Sentence API client

**Objective:** Fetch sentence start/next/complete/phrases data from the backend through one actor-isolated client.

**Files:**

- Create: `apps/talk/ios/Sources/TalkAPIClient.swift`
- Modify: `apps/talk/ios/Tests/TikoTalkTests.swift`

**Design:**

Use an `actor`:

```swift
actor TalkAPIClient {
    enum Environment: Sendable {
        case development
        case production
        case custom(URL)

        var baseURL: URL {
            switch self {
            case .development:
                URL(string: "https://dev-api.tikotalks.com/v1/sentence")!
            case .production:
                URL(string: "https://api.tikotalks.com/v1/sentence")!
            case .custom(let url):
                url
            }
        }
    }

    private let environment: Environment
    private let session: URLSession

    init(environment: Environment = .development, session: URLSession = .shared) {
        self.environment = environment
        self.session = session
    }
}
```

Methods:

- `start(locale:userId:sessionToken:) async throws -> TalkSentenceStartResponse`
- `next(currentWords:locale:userId:sessionToken:) async throws -> TalkSentenceNextResponse`
- `complete(wordIds:locale:autoSave:userId:sessionToken:) async throws -> TalkSentenceCompleteResponse`

Auth/session:

- Accept optional `sessionToken` now.
- If present, send `Authorization: Bearer <token>`.
- If absent, allow dev/fallback behavior to continue until shared TikoKit identity is fully wired.
- Do not block app launch on account setup.

**Implementation warning:**

Check the actual live worker route contract before hardcoding query/body shape. Current TypeScript types indicate `SentenceStartRequest` but route is `GET /v1/sentence/start`; implementation may expect `?locale=en&userId=...` or derive from session. Inspect `workers/sentence-api/src/index.ts` before coding.

**Test requirement:**

Use a custom `URLProtocol` or injectable transport to assert:

- `start` builds `/start?locale=en` correctly.
- POST methods set `Content-Type: application/json`.
- `Authorization` header is included when token exists.
- Non-2xx responses throw a typed error with status/body.

**Verification:**

```bash
git diff --check
```

Mac XCTest as above.

Optional API smoke before final handoff:

```bash
curl -i 'https://dev-api.tikotalks.com/v1/sentence/start?locale=en'
```

Report if route returns auth/D1/deploy errors; do not hide API blockers with fallback data.

**Commit:**

```bash
git add apps/talk/ios/Sources/TalkAPIClient.swift apps/talk/ios/Tests/TikoTalkTests.swift
git commit -m "feat: add talk ios sentence api client"
```

---

### Task 6: Add offline fallback data and store state

**Objective:** Let the app render a small functional sentence-builder even when the API is unavailable, while keeping fallback clearly limited and non-authoritative.

**Files:**

- Create: `apps/talk/ios/Sources/TalkOfflineFallback.swift`
- Create: `apps/talk/ios/Sources/TalkStore.swift`
- Modify: `apps/talk/ios/Tests/TikoTalkTests.swift`

**Fallback scope:**

Minimal English only:

- 4–6 starter words: I, you, want, need, help, more
- 2–3 templates: I want ___, I need help, More ___ please
- 2–3 categories: pronouns, actions, extras

Do not encode transition rules beyond static initial render fallback. For suggestions after taps while offline, use either:

- No smart suggestions, with “offline limited mode” state; or
- A static `fallbackSuggestions` array explicitly named as fallback and tested as such.

**Store shape:**

Use `@Observable` if available in target, otherwise a `@MainActor` class with explicit state. Native-iOS skill prefers Observation.

State:

- `locale`
- `isLoading`
- `isOfflineFallback`
- `sentenceWords: [TalkWordTile]`
- `templates`
- `categories`
- `visibleWords`
- `suggestions`
- `savedPhrases`
- `errorMessage`
- `completedSentence`
- `audioURL`

Methods:

- `load()`
- `addWord(_:)`
- `removeWord(id:)`
- `clearSentence()`
- `applyTemplate(_:)`
- `completeSentence(autoSave:)`

Important behavior:

- `load()` attempts API first.
- On failure, loads `TalkOfflineFallback.startResponse` and sets `isOfflineFallback = true`.
- `addWord` updates sentence strip immediately for tactile responsiveness, then calls `/next` when online.
- If `/next` fails after startup, keep current strip and show fallback/no-suggestions state instead of crashing.

**Test requirement:**

Tests for:

- Failed API load falls back to `TalkOfflineFallback`.
- `addWord` appends exactly one word.
- `removeWord` removes only matching ID.
- `clearSentence` clears the strip.
- `completeSentence` refuses empty strip and does not call API.

**Verification:** Mac XCTest.

**Commit:**

```bash
git add apps/talk/ios/Sources/TalkOfflineFallback.swift apps/talk/ios/Sources/TalkStore.swift apps/talk/ios/Tests/TikoTalkTests.swift
git commit -m "feat: add talk ios sentence state"
```

---

### Task 7: Build the native sentence strip and word tile views

**Objective:** Render the core child-facing interaction: tap tiles into a sentence strip, remove chips, clear, and show suggestions/categories.

**Files:**

- Create: `apps/talk/ios/Sources/TalkWordTileView.swift`
- Create: `apps/talk/ios/Sources/TalkSentenceStripView.swift`
- Modify: `apps/talk/ios/Sources/TalkView.swift`
- Modify: `apps/talk/ios/Tests/TikoTalkTests.swift`

**UI requirements:**

- Large touch targets, child-first spacing.
- Sentence strip remains visible at top of content area.
- Empty strip has obvious prompt, e.g. “Build a sentence”.
- Word tiles use text first; icon/image is optional.
- Suggestions row is visually separate from full word grid.
- Use `LazyVGrid` for word tiles.
- Use haptics on tile add/remove/clear.
- No scroll-dependent critical action if avoidable; Speak/Clear should remain reachable.

**Testing:**

Pure SwiftUI rendering tests may be limited without a third-party inspector. Keep tests on deterministic view model/store behavior and small formatting helpers.

Add helper tests for:

- Sentence display joins word text with spaces.
- Speak is disabled when strip is empty.
- Visible tile count matches store words.

**Verification:**

Mac simulator visual pass after `xcodebuild test`:

- Launch app.
- Confirm no login wall.
- Confirm Talk shell header appears.
- Tap “I” then “want”; strip updates.
- Remove a strip chip; strip updates.
- Clear sentence; empty state returns.

**Commit:**

```bash
git add apps/talk/ios/Sources/TalkView.swift apps/talk/ios/Sources/TalkWordTileView.swift apps/talk/ios/Sources/TalkSentenceStripView.swift apps/talk/ios/Tests/TikoTalkTests.swift
git commit -m "feat: build talk ios sentence composer"
```

---

### Task 8: Add templates and saved phrases sheets

**Objective:** Give native access to Talk’s two fast paths: one-tap templates and saved/frequent phrases.

**Files:**

- Create: `apps/talk/ios/Sources/TalkTemplateSheet.swift`
- Create: `apps/talk/ios/Sources/TalkSavedPhrasesSheet.swift`
- Modify: `apps/talk/ios/Sources/TalkView.swift`
- Modify: `apps/talk/ios/Sources/TalkStore.swift`
- Modify: `apps/talk/ios/Tests/TikoTalkTests.swift`

**Behavior:**

- Header or prominent content button opens templates.
- Saved phrases appear as a native sheet/list if API returns any.
- Applying a template pre-fills fixed words where possible and requests backend `/next` for slot suggestions.
- Tapping a saved phrase fills the strip and optionally offers Speak; do not auto-speak unless product review confirms it feels right for children.

**Important caveat:**

Current TypeScript `Template` has `pattern` but not explicit fixed word IDs; native template application may need backend support or a web-equivalent behavior. Inspect `workers/sentence-api/src/index.ts` and web implementation before implementing. If the backend currently only returns display patterns, v1 native should show templates as starters that call a backend endpoint or map only known fallback templates; document the API gap instead of inventing client-side grammar.

**Test requirement:**

- Applying a fallback template adds expected fallback words.
- Applying an API template without word IDs does not crash and sets a “template selected” state/API request path.
- Saved phrase selection maps `wordIds` through current known vocabulary; unknown IDs are ignored or shown as unavailable without crashing.

**Commit:**

```bash
git add apps/talk/ios/Sources/TalkTemplateSheet.swift apps/talk/ios/Sources/TalkSavedPhrasesSheet.swift apps/talk/ios/Sources/TalkView.swift apps/talk/ios/Sources/TalkStore.swift apps/talk/ios/Tests/TikoTalkTests.swift
git commit -m "feat: add talk ios templates and phrases"
```

---

### Task 9: Add speech and audio playback

**Objective:** Speak completed sentences through the backend audio URL when available, with native speech fallback for offline/no-audio cases.

**Files:**

- Create: `apps/talk/ios/Sources/TalkSpeechService.swift`
- Create: `apps/talk/ios/Sources/TalkAudioPlayer.swift`
- Modify: `apps/talk/ios/Sources/TalkStore.swift`
- Modify: `apps/talk/ios/Sources/TalkView.swift`
- Modify: `apps/talk/ios/Tests/TikoTalkTests.swift`

**Behavior:**

1. User taps Speak.
2. If online and sentence has word IDs, call `TalkAPIClient.complete(...)`.
3. If response contains `audioUrl`, play it with `AVPlayer` via `TalkAudioPlayer`.
4. If API/audio fails or offline fallback is active, use `AVSpeechSynthesizer` to speak joined word text.
5. Always provide visible pressed/speaking state and haptic feedback.

**AVSpeechSynthesizer pattern:**

Use an app-local service initially:

```swift
import AVFoundation

@MainActor
final class TalkSpeechService {
    private let synthesizer = AVSpeechSynthesizer()

    func speak(_ text: String, languageCode: String = "en-US") {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        let utterance = AVSpeechUtterance(string: trimmed)
        utterance.voice = AVSpeechSynthesisVoice(language: languageCode)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.92
        utterance.pitchMultiplier = 1.04
        synthesizer.speak(utterance)
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }
}
```

**Test requirement:**

Keep tests off actual audio hardware. Test:

- Empty strip does not call complete.
- Non-empty strip calls complete with ordered word IDs.
- API complete failure triggers fallback speech path via an injectable protocol/spying fake.

**Commit:**

```bash
git add apps/talk/ios/Sources/TalkSpeechService.swift apps/talk/ios/Sources/TalkAudioPlayer.swift apps/talk/ios/Sources/TalkStore.swift apps/talk/ios/Sources/TalkView.swift apps/talk/ios/Tests/TikoTalkTests.swift
git commit -m "feat: add talk ios speech playback"
```

---

### Task 10: Wire shared identity/session gently

**Objective:** Use Tiko’s device-first identity model without blocking the child-facing app.

**Files:**

- Modify: `apps/talk/ios/Sources/TalkStore.swift`
- Modify: `apps/talk/ios/Sources/TalkAPIClient.swift`
- Possibly modify: `packages/tikokit-ios/Sources/TikoKit/TikoIdentity.swift` only if the shared scaffolding lacks a tiny needed accessor.
- Modify: tests as needed.

**Behavior:**

- On launch, Talk should work even before identity bootstrap finishes.
- If TikoKit identity/session exists, pass subject/session to Sentence API.
- If no identity exists, allow TikoKit’s shared account/setup sheet to bootstrap later.
- Do not show login/signup as a first-run gate.
- Do not add app-local account sheets.

**Implementation caution:**

If `TikoIdentity.swift` is only a scaffold, do not overbuild identity in this Talk slice. Add minimal integration seams and document the remaining shared identity task. Identity should be solved in TikoKit, not copied into Talk.

**Test requirement:**

- `TalkAPIClient` includes bearer token when supplied.
- Store can load fallback/start without a user ID.
- Store uses subject ID when supplied.

**Commit:**

```bash
git add apps/talk/ios/Sources/TalkStore.swift apps/talk/ios/Sources/TalkAPIClient.swift packages/tikokit-ios/Sources/TikoKit/TikoIdentity.swift apps/talk/ios/Tests/TikoTalkTests.swift
git commit -m "feat: connect talk ios to device session"
```

Only include `TikoIdentity.swift` in the commit if actually changed.

---

### Task 11: Add app-specific settings

**Objective:** Put Talk-specific controls into shared TikoKit settings without duplicating global account/language/color sheets.

**Files:**

- Modify: `apps/talk/ios/Sources/TalkView.swift`
- Modify: `apps/talk/ios/Sources/TalkStore.swift`
- Modify: `apps/talk/ios/Tests/TikoTalkTests.swift`

**Settings:**

Use `settingsContent` on `TikoAppShell` for app-local settings only:

- Speak automatically after selecting saved phrase: default off until product review.
- Use native voice fallback when offline: default on.
- Show advanced categories: default off if the UI feels busy.

Persist simple toggles with `@AppStorage` or store-backed app settings.

Do not duplicate:

- Account
- Language
- Color mode
- Login/signup

Those belong to TikoKit shared sheets.

**Validation scan:**

```bash
rg 'tikoSettingsPopup|showingSettings|TikoHeaderAction\(id: "settings"' apps/talk/ios packages/tikokit-ios --glob '*.swift'
```

Expected: no app-local duplicate settings popup/header action in `apps/talk/ios`.

**Commit:**

```bash
git add apps/talk/ios/Sources/TalkView.swift apps/talk/ios/Sources/TalkStore.swift apps/talk/ios/Tests/TikoTalkTests.swift
git commit -m "feat: add talk ios settings"
```

---

### Task 12: Document Talk iOS status and API gaps

**Objective:** Keep Talk docs honest about native readiness and any backend contract gaps discovered during implementation.

**Files:**

- Modify: `apps/talk/docs/IMPLEMENTATION.md`
- Modify: `docs/apps/talk.md`

**Content to add:**

- `apps/talk/ios` exists as the native SwiftUI client.
- It consumes Sentence API contracts; it does not own grammar/suggestions.
- Current supported flows: startup, word tap, strip edit, speak, fallback mode, templates/saved phrases if implemented.
- Explicit remaining gaps, if any:
  - macOS Xcode validation pending
  - production API/domain not promoted
  - template application needs richer API word-ID payload
  - identity/session fully shared but backend auth still pending

**Validation:**

```bash
rg 'grammar logic|LLM|password|Supabase|login wall' apps/talk/docs docs/apps/talk.md
```

Expected: no new forbidden or misleading native-client language.

**Commit:**

```bash
git add apps/talk/docs/IMPLEMENTATION.md docs/apps/talk.md
git commit -m "docs: document talk ios client status"
```

---

### Task 13: Add iOS validation workflow matrix entry if needed

**Objective:** Ensure Talk iOS is included in the same cheap/native validation path as the existing Tiko iOS apps.

**Files:**

- Modify: existing iOS workflow under `.github/workflows/` only if one already exists.
- Do not create a broad expensive workflow without checking current cost guard conventions.

**Steps:**

1. Inspect current workflows:

   ```bash
   find .github/workflows -maxdepth 1 -type f | sort
   rg 'xcodebuild|xcodegen|ios|TikoYesNo|TikoCards|TikoType|TikoTimer|TikoRadio' .github/workflows
   ```

2. If there is an iOS matrix, add Talk with path `apps/talk/ios` and scheme `TikoTalk`.

3. Keep expensive macOS workflows manual if that is the current convention; do not turn on uncontrolled macOS minutes.

**Verification:**

```bash
git diff --check
```

After push, verify workflow status with `gh run list` if workflow triggers.

**Commit:**

```bash
git add .github/workflows/<ios-workflow>.yml
git commit -m "ci: include talk ios in native validation"
```

Skip this task if no current iOS workflow exists or if adding one would violate cost guard conventions.

---

### Task 14: Run final validation and prepare handoff

**Objective:** Prove the source is clean and clearly separate what is validated on VPS vs Mac.

**Linux/VPS validation:**

```bash
git diff --check
find apps/talk/ios -type f | sort
rg 'apps/web' apps/talk/ios packages/tikokit-ios --glob '*.swift' --glob 'Project.yml'
rg 'grammar|transition|validTransitions|LLM|password|Supabase|login wall' apps/talk/ios apps/talk/docs docs/apps/talk.md --glob '!*.json'
```

Expected:

- `git diff --check`: no whitespace errors.
- `find`: expected Talk iOS files present.
- `apps/web` scan: no native dependency on web packages.
- Doctrine scan: only acceptable documentation references; no client-owned grammar implementation or forbidden auth language.

If JS/shared files changed and repo dependencies are installed, also run:

```bash
npm run lint -- --if-present
npm run test -- --if-present
```

But do not spend time forcing unrelated repo-wide failures green if the touched area is native Swift source and TikoKit only. Report unrelated failures clearly.

**Mac validation required before “buildable” claim:**

```bash
cd apps/talk/ios
xcodegen generate
xcodebuild test -scheme TikoTalk -destination 'platform=iOS Simulator,name=iPhone 15' CODE_SIGNING_ALLOWED=NO
```

**Optional API smoke:**

```bash
curl -i 'https://dev-api.tikotalks.com/v1/sentence/start?locale=en'
```

Report API state separately:

- Source implemented
- Local fallback works
- Dev API reachable/unreachable
- Mac/Xcode build tested/not tested
- Production not promoted unless explicitly approved and smoke-tested

**Final commit/push:**

```bash
git status --short --branch
git log --oneline --decorate -n 5
git push -u origin feat/talk-ios
```

Open PR to `development` if this stayed on a feature branch.

---

## Acceptance Criteria

Source-level:

- [ ] `apps/talk/ios/Project.yml` exists and follows product-first Tiko app layout.
- [ ] Bundle ID is `mt.tiko.talk`.
- [ ] App uses `TikoAppShell` and `.talk` from shared `TikoAppColor`.
- [ ] App has no login wall and no app-local duplicate account/settings flow.
- [ ] Swift DTOs mirror the shared Talk API contract.
- [ ] API client talks to Sentence API via HTTPS JSON and supports bearer session when available.
- [ ] Store loads API first and falls back to limited bundled English data on failure.
- [ ] Child can tap word tiles into a sentence strip, remove/clear words, and speak the sentence.
- [ ] Speech uses backend audio URL when available and AVSpeechSynthesizer fallback otherwise.
- [ ] Tests cover model decoding, URL/request construction, fallback loading, sentence mutations, and speak/complete control flow.
- [ ] Docs state native status and remaining blockers honestly.

Doctrine-level:

- [ ] No Swift grammar engine.
- [ ] No child-facing LLM calls.
- [ ] No passwords/login-first copy.
- [ ] No Supabase references.
- [ ] No web package imports from native app.

Validation-level:

- [ ] `git diff --check` passes.
- [ ] Linux source scans pass.
- [ ] Mac `xcodegen generate` passes.
- [ ] Mac `xcodebuild test -scheme TikoTalk ... CODE_SIGNING_ALLOWED=NO` passes before claiming native buildability.
- [ ] Dev Sentence API smoke result is reported separately from fallback/local app behavior.

---

## Risks / Tradeoffs

- **Template API gap:** If `/start` templates contain display patterns but not word IDs or slot IDs, native cannot correctly prefill templates without either backend support or client-side grammar. Do not add client grammar; either use fallback-only template prefill or add a backend contract task.
- **Identity maturity:** TikoKit identity may still be scaffold-level. Talk should use existing shared identity seams without building app-local auth.
- **API deployment drift:** Dev Sentence API may be deployed differently than the TypeScript contract. Inspect worker code and smoke exact URLs before final wiring.
- **VPS validation limit:** Linux can check source shape, docs, and static scans. XcodeGen and simulator tests must run on macOS.
- **UI density:** Talk can become busy quickly. Prefer one strong primary sentence-building surface over exposing all vocabulary/template/saved-phrase controls at once.

---

## Open Questions for Product Review

1. Should saved phrase tap auto-speak immediately, or fill the strip and require Speak?
2. Should v1 include drag-to-reorder in the sentence strip, or is tap-add/tap-remove enough for the first native slice?
3. What should Talk’s final canonical color be? Suggested initial palette is blue communication-oriented, but it is close to Type.
4. Does the backend need a richer template-start endpoint so iOS/web can both apply templates without client-side grammar?
5. Should Talk iOS target iPhone-only like the existing projects, or support iPad early because AAC-style sentence building benefits from larger screens?

---

## Recommended Implementation Order

Do not build this as one giant task. Recommended slices:

1. TikoKit `.talk` color.
2. XcodeGen scaffold.
3. Swift API models + decoder tests.
4. API client + request tests.
5. Store + fallback tests.
6. Sentence strip + tile composer.
7. Templates/saved phrases.
8. Speech/audio.
9. Shared identity/settings polish.
10. Docs + validation + PR.
