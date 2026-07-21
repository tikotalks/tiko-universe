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

    // MARK: - Req 3: space commits the in-progress word as a chip

    func testSpaceCommitsWordAndKeepsTyping() {
        let h = key("h")
        XCTAssertTrue(h.waitForExistence(timeout: 20), "Keyboard should be present")
        XCTAssertTrue(waitUntilHittable(h, timeout: 10), "Keys should be hittable")

        // Type "hi", commit with space, then type "yo".
        h.tap()
        key("i").tap()
        let space = app.buttons["key-space"]
        XCTAssertTrue(space.waitForExistence(timeout: 5), "Space key should exist")
        space.tap()
        key("y").tap()
        key("o").tap()

        // The committed word 'hi' persists as its own chip (accessibilityLabel
        // "hi"), separate from the in-progress word. Once a committed chip exists
        // the bar no longer collapses into one element, so assert on the chips.
        let committed = app.staticTexts.matching(NSPredicate(format: "label ==[c] %@", "hi")).firstMatch
        XCTAssertTrue(committed.waitForExistence(timeout: 5),
                      "Committed word chip 'hi' should remain after typing more")

        // The in-progress word 'yo' shows as its own current-word chip.
        let current = app.staticTexts.matching(NSPredicate(format: "label ==[c] %@", "yo")).firstMatch
        XCTAssertTrue(current.waitForExistence(timeout: 5),
                      "In-progress word chip 'yo' should exist alongside the committed word")
    }

    // MARK: - Req 7: backspace deletes the last letter

    func testBackspaceDeletesLastLetter() {
        let h = key("h")
        XCTAssertTrue(h.waitForExistence(timeout: 20), "Keyboard should be present")
        XCTAssertTrue(waitUntilHittable(h, timeout: 10), "Keys should be hittable")

        // Type "hi", then backspace twice to empty the in-progress word.
        h.tap()
        key("i").tap()

        let typeBar = elementWithIdentifier("typeBar")
        XCTAssertTrue(typeBar.waitForExistence(timeout: 5), "Sentence bar should exist")
        XCTAssertTrue(typeBar.label.lowercased().contains("hi"), "Bar should show 'hi' before deleting")

        let backspace = app.buttons["key-backspace"]
        XCTAssertTrue(backspace.waitForExistence(timeout: 5), "Backspace key should exist")
        backspace.tap()
        backspace.tap()

        // With nothing typed, the placeholder returns and 'hi' is gone.
        XCTAssertTrue(waitUntil(timeout: 5) {
            !self.elementWithIdentifier("typeBar").label.lowercased().contains("hi")
        }, "Backspacing should remove the typed letters, bar was: \(self.elementWithIdentifier("typeBar").label)")
    }

    // MARK: - Req 6: clear button empties the sentence

    func testClearButtonEmptiesSentence() {
        let h = key("h")
        XCTAssertTrue(h.waitForExistence(timeout: 20), "Keyboard should be present")
        XCTAssertTrue(waitUntilHittable(h, timeout: 10), "Keys should be hittable")

        h.tap()
        key("i").tap()

        let clear = app.buttons["clearButton"]
        XCTAssertTrue(clear.waitForExistence(timeout: 5), "Clear button should exist")
        XCTAssertTrue(waitUntilHittable(clear, timeout: 5), "Clear should be hittable once there is content")
        clear.tap()

        // The typed text is gone from the bar…
        XCTAssertTrue(waitUntil(timeout: 5) {
            !self.elementWithIdentifier("typeBar").label.lowercased().contains("hi")
        }, "Clear should remove the typed text, bar was: \(self.elementWithIdentifier("typeBar").label)")

        // …and the app remains usable (keyboard still there).
        XCTAssertTrue(key("h").exists, "App should keep working after clearing")
    }

    // MARK: - Req 12: symbols/numbers layer is reachable and types digits

    func testSymbolsLayerTypesDigits() {
        let toggle = app.buttons["key-symbols-toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 20), "Symbols toggle should exist")
        XCTAssertTrue(waitUntilHittable(toggle, timeout: 10), "Symbols toggle should be hittable")

        // Letters visible before toggling; digit keys should not be.
        XCTAssertTrue(key("q").exists, "Letter keys should be present before toggling")

        toggle.tap()

        // After toggling, the digit "1" key appears and can be typed.
        let one = key("1")
        XCTAssertTrue(one.waitForExistence(timeout: 5), "Digit '1' key should appear on the symbols layer")
        XCTAssertTrue(waitUntilHittable(one, timeout: 5), "Digit key should be hittable")
        one.tap()

        let typeBar = elementWithIdentifier("typeBar")
        XCTAssertTrue(typeBar.waitForExistence(timeout: 5), "Sentence bar should exist")
        XCTAssertTrue(typeBar.label.contains("1"), "Typed digit should appear in the bar, was: \(typeBar.label)")

        // Toggling back returns to letters.
        app.buttons["key-symbols-toggle"].tap()
        XCTAssertTrue(key("q").waitForExistence(timeout: 5), "Letters should return after toggling back")
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

    /// Poll an arbitrary condition until it becomes true or the timeout elapses.
    @discardableResult
    private func waitUntil(timeout: TimeInterval, _ condition: () -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        return condition()
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
