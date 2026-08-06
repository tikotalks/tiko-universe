import XCTest

/// Requirements-based UI tests for Tiko Talk.
///
/// The headline test — `testLoginPopupSurvivesEmailInput` — is the shared runtime
/// regression test for App Review rejection 2.1 ("app reverted back after
/// inputting an email"): the account/login popup was being dismissed on iPad when
/// the keyboard appeared during email entry. The fix made the account popup
/// non-dismissible by keyboard / outside-tap / drag (see `tikoAccountPopup` in
/// TikoKit). Talk uses the same shared TikoAppShell account/login flow, so it must
/// hold the same guarantee. These tests drive the real UI and assert the login
/// card stays present after the email field is tapped and typed into.
///
/// The other tests assert the app is usable WITHOUT an account (the word board and
/// sentence bar are present on launch), that "Skip for now" returns to the working
/// app, and the Talk-specific flow: tapping a word tile puts that word into the
/// sentence bar.
final class TikoTalkUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        // Launch in the app's deterministic, offline scene so the built-in starter
        // word board is shown without any network dependency. This does not touch
        // the account / login flow, which is what the regression test exercises.
        app.launchArguments += ["--screenshot-mode", "--screenshot", "home"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Helpers

    /// Opens the account / login popup: tap the account avatar (opens the profile
    /// menu), then tap "Profile" to reach the login card. This is the shared
    /// TikoAppShell flow, identical across Tiko apps.
    private func openLoginCard() {
        let account = app.buttons["Account"]
        XCTAssertTrue(account.waitForExistence(timeout: 20), "Account button should exist on launch")
        // Splash overlay fades after ~1s; wait until the button is hittable.
        XCTAssertTrue(waitUntilHittable(account, timeout: 15), "Account button should become hittable")

        // Tapping Account (parent mode is the default with no signed-in identity)
        // presents the profile menu as an animated PopupView card. Re-open the menu
        // until the "Profile" row is in the tree, guarding the re-tap so we never
        // dismiss an already-open menu (which would also fail to hit the covered
        // Account button).
        let profileRow = app.buttons["Profile"]
        for _ in 0..<8 {
            // Only (re)tap when the menu is closed — once it's open the popup
            // covers the Account button, so isHittable guards against toggling it
            // shut. Re-tap when a previous tap was swallowed mid-splash.
            if !profileRow.exists, waitUntilHittable(account, timeout: 3) { account.tap() }
            if profileRow.waitForExistence(timeout: 6) { break }
        }
        XCTAssertTrue(profileRow.exists, "Profile menu should present a Profile row")

        // Tap Profile to open the login card, and confirm the card's "Sign in" title
        // actually appears — the identity subsystem is slow to present on the first
        // (cold) open. Retry the Profile tap, re-opening the account menu if it got
        // dismissed, until the login card is on screen. A coordinate tap is used
        // because a direct element.tap() can fail with "element no longer valid after
        // interruption handling" while the popups animate.
        let signIn = loginCardTitle
        for _ in 0..<4 {
            if signIn.exists { break }
            if profileRow.exists {
                _ = waitUntilHittable(profileRow, timeout: 12)
                robustTap(profileRow)
            } else if waitUntilHittable(account, timeout: 3) {
                // Menu dismissed without opening the card — reopen it.
                account.tap()
                _ = profileRow.waitForExistence(timeout: 6)
            }
            if signIn.waitForExistence(timeout: 12) { break }
        }
        XCTAssertTrue(signIn.exists, "Login card ('Sign in') should be presented after tapping Profile")
    }

    /// Tap an element via its centre coordinate (a raw screen point), which is more
    /// resilient than `element.tap()` when popups animate / auto-dismiss under load.
    private func robustTap(_ element: XCUIElement) {
        element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }

    /// Reliably move a board word into the sentence bar. Cloud bubbles pop in with
    /// staggered spring animations, so a single tap can be swallowed mid-animation.
    /// Retry the tap until the word appears in the sentence bar, checking for the
    /// result before every tap so a word is never added twice.
    private func addBoardWordToSentence(_ id: String, file: StaticString = #filePath, line: UInt = #line) {
        let tile = app.buttons["talk.board.word.\(id)"]
        XCTAssertTrue(tile.waitForExistence(timeout: 20), "Board word '\(id)' should exist", file: file, line: line)
        let sentenceWord = app.staticTexts["talk.sentence.word.\(id)"]
        var attempts = 0
        while !sentenceWord.exists && attempts < 8 {
            if waitUntilHittable(tile, timeout: 10) { robustTap(tile) }
            _ = sentenceWord.waitForExistence(timeout: 4)
            attempts += 1
        }
        XCTAssertTrue(sentenceWord.exists, "Board word '\(id)' should land in the sentence bar", file: file, line: line)
    }

    /// Poll for hittability (XCUIElement has no built-in wait-for-hittable).
    @discardableResult
    private func waitUntilHittable(_ element: XCUIElement, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if element.isHittable { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        return element.isHittable
    }

    @discardableResult
    private func waitUntilGone(_ element: XCUIElement, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if !element.exists { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        return !element.exists
    }

    /// The login card is identified by its "Sign in" title, the "Send sign-in
    /// code" primary button, and the "Skip for now" action (shared TikoKit).
    private var loginCardTitle: XCUIElement { app.staticTexts["Sign in"] }
    private var sendCodeButton: XCUIElement { app.buttons["Send sign-in code"] }
    private var skipButton: XCUIElement { app.buttons["Skip for now"] }

    /// The first text field that accepts editing (the email field in the login card).
    private func firstEditableTextField() -> XCUIElement {
        let byPlaceholder = app.textFields["you@example.com"]
        if byPlaceholder.exists { return byPlaceholder }
        return app.textFields.firstMatch
    }

    // MARK: - Req 1 / 14: usable without an account

    func testAppIsUsableWithoutLogin() {
        // The sentence bar (with its "Build a sentence" placeholder) and at least
        // one word tile must be present on launch, with no sign-in.
        let placeholder = app.staticTexts["talk.sentence.placeholder"]
        XCTAssertTrue(
            placeholder.waitForExistence(timeout: 20),
            "The sentence bar should be present on launch without login"
        )

        // A starter word tile ("want") should be on the board without an account.
        let wantTile = app.buttons["talk.board.word.want"]
        XCTAssertTrue(
            wantTile.waitForExistence(timeout: 20),
            "A starter word tile should be present on launch without login"
        )
        XCTAssertTrue(waitUntilHittable(wantTile, timeout: 10), "Word tile should become hittable")

        // Tapping a tile must not crash or require an account.
        addBoardWordToSentence("want")
        XCTAssertTrue(
            app.staticTexts["talk.sentence.word.want"].exists,
            "App should keep working after tapping a word"
        )
    }

    // MARK: - Req 15: Talk-specific flow — tap a word tile → it enters the sentence

    func testTappingWordTileAddsItToSentenceBar() {
        // Before tapping, the sentence bar shows its empty-state placeholder.
        let placeholder = app.staticTexts["talk.sentence.placeholder"]
        XCTAssertTrue(placeholder.waitForExistence(timeout: 20), "Sentence bar should start empty")

        // Tap the "want" word tile on the board — the tapped word must appear in
        // the sentence bar.
        addBoardWordToSentence("want")

        // And the empty-state placeholder is gone now that a word is present.
        XCTAssertTrue(
            waitUntilGone(placeholder, timeout: 5),
            "The 'Build a sentence' placeholder should disappear once a word is added"
        )
    }

    // MARK: - The grammar, end to end on the device

    /// Six taps, two clauses: "I am sad because I want mum."
    ///
    /// This is the whole point of the realizer, driven through the real app on a real
    /// simulator: the copula the child never tapped, the second clause getting its own
    /// subject, and the finished sentence shown above the strip rather than only
    /// spoken.
    func testBuildsATwoClauseSentenceAndShowsIt() {
        for word in ["i", "sad", "because", "i", "want", "mum"] {
            tapBoardWord(word)
        }

        let sentence = app.staticTexts["talk.sentence.text"]
        XCTAssertTrue(sentence.waitForExistence(timeout: 10), "the sentence should be shown, not only spoken")
        XCTAssertEqual(sentence.label, "I am sad because I want mum")

        // A passing test discards its attachments unless told to keep them, and this
        // screenshot is the evidence the sentence really reached the screen.
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// The negation tile, which no pack had until now: three tiles and a noun give the
    /// do-support nobody tapped.
    func testNegationTileProducesDoSupport() {
        for word in ["i", "not", "want", "mum"] {
            tapBoardWord(word)
        }

        let sentence = app.staticTexts["talk.sentence.text"]
        XCTAssertTrue(sentence.waitForExistence(timeout: 10))
        XCTAssertEqual(sentence.label, "I do not want mum")

        // A passing test discards its attachments unless told to keep them, and this
        // screenshot is the evidence the sentence really reached the screen.
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// Finds a tile through the search field, which is how a child reaches a word the
    /// ranked board does not offer — and taps it. Searching first means the tile is on
    /// screen, so this never has to scroll a moving board.
    private func tapBoardWord(_ id: String, file: StaticString = #filePath, line: UInt = #line) {
        // The search field lives behind a floating button until it is opened.
        var field = app.textFields["talk.board.search"]
        if !field.exists {
            let open = app.buttons["Search or add a word"]
            XCTAssertTrue(open.waitForExistence(timeout: 20), "search button should exist", file: file, line: line)
            XCTAssertTrue(waitUntilHittable(open, timeout: 15), "search button should be hittable", file: file, line: line)
            robustTap(open)
            field = app.textFields["talk.board.search"]
        }
        XCTAssertTrue(field.waitForExistence(timeout: 20), "search field should exist", file: file, line: line)
        if !field.isHittable { _ = waitUntilHittable(field, timeout: 10) }
        field.tap()
        // Clear whatever the last search left behind.
        if let existing = field.value as? String, !existing.isEmpty {
            field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: existing.count))
        }
        field.typeText(id)

        let tile = app.buttons["talk.board.word.\(id)"]
        XCTAssertTrue(tile.waitForExistence(timeout: 15), "no board tile for \"\(id)\"", file: file, line: line)
        XCTAssertTrue(waitUntilHittable(tile, timeout: 15), "tile \"\(id)\" never became hittable", file: file, line: line)
        robustTap(tile)
    }

    // MARK: - Req 17: REGRESSION — login popup survives email input

    func testLoginPopupSurvivesEmailInput() {
        openLoginCard()

        // The login card must be on screen.
        XCTAssertTrue(loginCardTitle.waitForExistence(timeout: 10), "Login card ('Sign in') should be presented")
        XCTAssertTrue(sendCodeButton.waitForExistence(timeout: 5), "Login card should show 'Send sign-in code'")

        // Find the email field, tap it (raises the keyboard) and type an email.
        let emailField = firstEditableTextField()
        XCTAssertTrue(emailField.waitForExistence(timeout: 5), "Email field should exist in the login card")
        XCTAssertTrue(waitUntilHittable(emailField, timeout: 5), "Email field should be hittable")
        emailField.tap()
        emailField.typeText("parent@example.com")

        // THE ASSERTION: after tapping + typing the email (keyboard shown), the
        // login card must STILL be present. Before the fix, the popup dismissed
        // here and the app "reverted back" — Apple's rejection.
        XCTAssertTrue(
            loginCardTitle.exists,
            "REGRESSION: the login card was dismissed after typing an email — the non-dismissible-popup fix is NOT working."
        )
        XCTAssertTrue(
            sendCodeButton.exists,
            "REGRESSION: the login card's primary button disappeared after email input — the fix is NOT working."
        )

        // The typed email should have registered in the field.
        if let value = emailField.value as? String {
            XCTAssertTrue(value.contains("parent@example.com"), "Typed email should be present in the field, was: \(value)")
        }
    }

    // MARK: - Req 16: "Skip for now" returns to the working app

    func testSkipForNowReturnsToUsableApp() {
        openLoginCard()
        XCTAssertTrue(skipButton.waitForExistence(timeout: 10), "Login card should offer 'Skip for now'")

        // The login card slides in as a popup too; tap once settled, with the same
        // coordinate-tap fallback when hit-testing still refuses the centre. Retry
        // until the card is gone — a tap can be swallowed mid-animation under the
        // parallel-simulator load, and the dismiss animation itself can be slow.
        var dismissed = false
        for _ in 0..<4 where !dismissed {
            if skipButton.exists {
                if waitUntilHittable(skipButton, timeout: 12) {
                    skipButton.tap()
                } else {
                    skipButton.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
                }
            }
            dismissed = waitUntilGone(loginCardTitle, timeout: 8)
        }

        // Popup dismissed → login card gone, app usable again.
        XCTAssertTrue(dismissed, "'Skip for now' should dismiss the login card")
        XCTAssertTrue(
            app.buttons["talk.board.word.want"].waitForExistence(timeout: 10),
            "App should be usable (word board present) after skipping login"
        )
    }
}
