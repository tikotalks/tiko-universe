import XCTest

/// Requirements-based UI tests for Tiko Type.
///
/// The headline test — `testLoginPopupSurvivesEmailInput` — is the shared
/// runtime regression test for App Review rejection 2.1 ("app reverted back
/// after inputting an email"): the account/login popup was being dismissed when
/// the keyboard appeared during email entry. The fix made the account popup
/// non-dismissible by keyboard / outside-tap / drag (see `tikoAccountPopup` in
/// TikoKit). It is copied verbatim across the Tiko apps so any app that
/// regresses this shared behaviour fails.
///
/// The other tests assert the app is usable WITHOUT an account (keyboard present
/// on launch), that typing shows text and the speak button works, and that
/// "Skip for now" returns to the working app.
final class TikoTypeUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        // Launch in the deterministic, offline screenshot mode so nothing depends
        // on the network. The "home" scene renders the normal (empty) keyboard —
        // this does not touch the account / login flow, which is what the
        // regression test exercises.
        app.launchArguments += ["--screenshot-mode", "--screenshot", "home"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Helpers

    /// Opens the account / login popup: tap the account avatar (opens the
    /// profile menu in parent mode), then tap "Profile" to reach the login card.
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

    /// The login card is identified by its "Sign in" title, the "Send sign-in
    /// code" primary button, and the "Skip for now" action.
    private var loginCardTitle: XCUIElement { app.staticTexts["Sign in"] }
    private var sendCodeButton: XCUIElement { app.buttons["Send sign-in code"] }
    private var skipButton: XCUIElement { app.buttons["Skip for now"] }

    /// A letter key on the on-screen keyboard, addressed by its stable
    /// identifier ("key-h") independent of capitalisation.
    private func key(_ letter: String) -> XCUIElement { app.buttons["key-\(letter)"] }

    // MARK: - Req 1 / 19: usable without an account

    func testAppIsUsableWithoutLogin() {
        // The on-screen keyboard must be present on launch, with no sign-in.
        let h = key("h")
        let e = key("e")
        XCTAssertTrue(h.waitForExistence(timeout: 20), "Keyboard keys should be present on launch without login")
        XCTAssertTrue(e.waitForExistence(timeout: 20), "Keyboard keys should be present on launch without login")

        // And they should become genuinely interactive (splash gone).
        XCTAssertTrue(waitUntilHittable(h, timeout: 10), "A key should be hittable")

        // Tapping a key must not crash or require an account.
        h.tap()
        XCTAssertTrue(key("h").exists, "App should keep working after typing")
    }

    // MARK: - Req 2 / 4 / 19: type shows text, speak works

    func testTypingShowsTextAndSpeaks() {
        let h = key("h")
        XCTAssertTrue(h.waitForExistence(timeout: 20), "Keyboard should be present")
        XCTAssertTrue(waitUntilHittable(h, timeout: 10), "Keys should be hittable")

        // Type "hi".
        h.tap()
        key("i").tap()

        // The typed text should appear in the sentence bar. SwiftUI collapses the
        // bar (its stack of word chips, including the in-progress "typeCurrentWord"
        // chip) into a single accessibility element whose label concatenates the
        // chips, so assert against the bar element's label rather than the
        // individual chip.
        let typeBar = elementWithIdentifier("typeBar")
        XCTAssertTrue(typeBar.waitForExistence(timeout: 5),
                      "Typed text should appear in the sentence bar")
        let barLabel = typeBar.label
        XCTAssertTrue(barLabel.lowercased().contains("hi"),
                      "Sentence bar should contain the typed letters, was: \(barLabel)")

        // The speak button becomes enabled once there is content; tapping it must
        // not crash or require an account.
        let speak = app.buttons["speakButton"]
        XCTAssertTrue(speak.waitForExistence(timeout: 5), "Speak button should exist")
        XCTAssertTrue(waitUntilHittable(speak, timeout: 5), "Speak button should be hittable once there is text")
        speak.tap()
        XCTAssertTrue(key("h").exists, "App should keep working after speaking")
    }

    // MARK: - Req 21: REGRESSION — login popup survives email input

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

    // MARK: - Req 20: "Skip for now" returns to the working app

    func testSkipForNowReturnsToUsableApp() {
        openLoginCard()
        XCTAssertTrue(skipButton.waitForExistence(timeout: 10), "Login card should offer 'Skip for now'")
        XCTAssertTrue(waitUntilHittable(skipButton, timeout: 5), "'Skip for now' should be hittable")
        skipButton.tap()

        // Popup dismissed → login card gone, app usable again.
        XCTAssertTrue(waitUntilGone(loginCardTitle, timeout: 10), "'Skip for now' should dismiss the login card")
        XCTAssertTrue(key("h").waitForExistence(timeout: 10), "App should be usable after skipping login")
    }

    // MARK: - Small helpers

    /// The first text field that accepts editing (the email field in the login card).
    private func firstEditableTextField() -> XCUIElement {
        let byPlaceholder = app.textFields["you@example.com"]
        if byPlaceholder.exists { return byPlaceholder }
        return app.textFields.firstMatch
    }

    /// Look an element up by accessibility identifier across the common types the
    /// sentence-bar chip could be exposed as.
    private func elementWithIdentifier(_ identifier: String) -> XCUIElement {
        let staticText = app.staticTexts[identifier]
        if staticText.exists { return staticText }
        let other = app.otherElements[identifier]
        if other.exists { return other }
        return staticText
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
}
