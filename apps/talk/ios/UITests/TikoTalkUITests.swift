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
        XCTAssertTrue(waitUntilHittable(account, timeout: 10), "Account button should become hittable")
        account.tap()

        let profileRow = app.buttons["Profile"]
        XCTAssertTrue(profileRow.waitForExistence(timeout: 10), "Profile menu should present a Profile row")
        XCTAssertTrue(waitUntilHittable(profileRow, timeout: 5), "Profile row should be hittable")
        profileRow.tap()
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
        wantTile.tap()
        XCTAssertTrue(
            app.buttons["talk.board.word.want"].waitForExistence(timeout: 10),
            "App should keep working after tapping a word"
        )
    }

    // MARK: - Req 15: Talk-specific flow — tap a word tile → it enters the sentence

    func testTappingWordTileAddsItToSentenceBar() {
        // Before tapping, the sentence bar shows its empty-state placeholder.
        let placeholder = app.staticTexts["talk.sentence.placeholder"]
        XCTAssertTrue(placeholder.waitForExistence(timeout: 20), "Sentence bar should start empty")

        // Tap the "want" word tile on the board.
        let wantTile = app.buttons["talk.board.word.want"]
        XCTAssertTrue(wantTile.waitForExistence(timeout: 20), "The 'want' word tile should exist on the board")
        XCTAssertTrue(waitUntilHittable(wantTile, timeout: 10), "The 'want' word tile should be hittable")
        wantTile.tap()

        // THE ASSERTION: the tapped word now appears in the sentence bar.
        let sentenceWord = app.staticTexts["talk.sentence.word.want"]
        XCTAssertTrue(
            sentenceWord.waitForExistence(timeout: 10),
            "Tapping a word tile should place that word into the sentence bar"
        )
        // And the empty-state placeholder is gone now that a word is present.
        XCTAssertTrue(
            waitUntilGone(placeholder, timeout: 5),
            "The 'Build a sentence' placeholder should disappear once a word is added"
        )
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
        XCTAssertTrue(waitUntilHittable(skipButton, timeout: 5), "'Skip for now' should be hittable")
        skipButton.tap()

        // Popup dismissed → login card gone, app usable again.
        XCTAssertTrue(waitUntilGone(loginCardTitle, timeout: 10), "'Skip for now' should dismiss the login card")
        XCTAssertTrue(
            app.buttons["talk.board.word.want"].waitForExistence(timeout: 10),
            "App should be usable (word board present) after skipping login"
        )
    }
}
