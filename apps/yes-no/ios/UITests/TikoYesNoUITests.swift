import XCTest

/// Requirements-based UI tests for Tiko Yes-No.
///
/// The headline test — `testLoginPopupSurvivesEmailInput` — is the runtime
/// regression test for App Review rejection 2.1 ("app reverted back after
/// inputting an email"): the account/login popup was being dismissed on iPad
/// when the keyboard appeared during email entry. The fix made the account
/// popup non-dismissible by keyboard / outside-tap / drag (see
/// `tikoAccountPopup` in TikoKit). These tests drive the real UI and assert the
/// login card stays present after the email field is tapped and typed into.
///
/// The other tests assert the app is usable WITHOUT an account (YES / NO present
/// on launch) and that "Skip for now" returns to the working app.
final class TikoYesNoUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        // Launch in the app's deterministic, offline scene so the built-in
        // Yes / No set is shown without any network dependency. This does not
        // touch the account / login flow, which is what the regression test
        // exercises.
        app.launchArguments += ["--screenshot-mode", "--screenshot", "home"]
        // Start every UI test from a clean persisted state so tests are
        // deterministic and order-independent (history / custom sets / settings
        // otherwise leak across launches via UserDefaults).
        app.launchArguments += ["--uitest-reset"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Helpers

    /// Let the run loop breathe so popup present/dismiss animations can settle
    /// before the next interaction (the exyte PopupView flows animate in/out).
    private func settle(_ seconds: TimeInterval = 0.5) {
        RunLoop.current.run(until: Date().addingTimeInterval(seconds))
    }

    /// Taps `control` and retries until `target` exists. Popup-presenting taps
    /// race the launch splash and present/dismiss animations, so a single tap is
    /// not reliable; this retries the tap a few times.
    @discardableResult
    private func tap(_ control: XCUIElement, until target: XCUIElement, attempts: Int = 5, perAttempt: TimeInterval = 4) -> Bool {
        guard control.waitForExistence(timeout: 20) else { return false }
        waitUntilHittable(control, timeout: 10)
        for _ in 0..<attempts {
            if target.waitForExistence(timeout: 0.3) { return true }
            if control.exists && control.isHittable { control.tap() }
            if target.waitForExistence(timeout: perAttempt) { return true }
            settle(0.4)
        }
        return target.exists
    }

    /// Opens the account / login popup: tap the account avatar (opens the profile
    /// menu in parent mode), tap "Profile" to reach the login card. Both hops can
    /// race the identity bootstrap and auto-dismiss, so the whole sequence is
    /// retried until the "Sign in" card is on screen.
    private func openLoginCard() {
        let account = app.buttons["Account"]
        XCTAssertTrue(account.waitForExistence(timeout: 20), "Account button should exist on launch")
        // Splash overlay fades after ~1s; wait until the button is hittable.
        XCTAssertTrue(waitUntilHittable(account, timeout: 10), "Account button should become hittable")

        let profileRow = app.buttons["Profile"]
        for _ in 0..<5 {
            if loginCardTitle.waitForExistence(timeout: 0.3) { return }
            // Open the profile menu if it isn't already up.
            if !profileRow.exists {
                if account.isHittable { account.tap() }
                _ = profileRow.waitForExistence(timeout: 6)
            }
            // Reach the login card from the profile menu.
            if profileRow.exists, waitUntilHittable(profileRow, timeout: 3) {
                profileRow.tap()
            }
            if loginCardTitle.waitForExistence(timeout: 6) { return }
            settle(0.5)
        }
        XCTAssertTrue(loginCardTitle.exists, "Could not reach the login card ('Sign in')")
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

    /// Finds a control by accessibility identifier across the element types
    /// SwiftUI may vend it as (button, textField, image, other, staticText).
    private func element(withIdentifier identifier: String) -> XCUIElement {
        let button = app.buttons[identifier]
        if button.exists { return button }
        let field = app.textFields[identifier]
        if field.exists { return field }
        let other = app.otherElements[identifier]
        if other.exists { return other }
        let image = app.images[identifier]
        if image.exists { return image }
        return app.descendants(matching: .any).matching(identifier: identifier).firstMatch
    }

    /// A button whose (possibly composed) accessibility label contains `text`.
    private func button(containing text: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
    }

    /// Opens the settings popup via the header gear button, retrying until the
    /// settings content ("Speak answers" row) is on screen.
    private func openSettings() {
        let settings = app.buttons["Settings"]
        let opened = tap(settings, until: app.staticTexts["Speak answers"])
        XCTAssertTrue(opened, "Settings popup should present its content ('Speak answers')")
        settle(0.4)
    }

    /// The login card is identified by its "Sign in" title, the "Send sign-in
    /// code" primary button, and the "Skip for now" action.
    private var loginCardTitle: XCUIElement { app.staticTexts["Sign in"] }
    private var sendCodeButton: XCUIElement { app.buttons["Send sign-in code"] }
    private var skipButton: XCUIElement { app.buttons["Skip for now"] }

    // MARK: - Req 1 / 15: usable without an account

    func testAppIsUsableWithoutLogin() {
        // The two big answer buttons must be present on launch, with no sign-in.
        let yes = app.buttons["Yes"]
        let no = app.buttons["No"]
        XCTAssertTrue(yes.waitForExistence(timeout: 20), "YES button should be present on launch without login")
        XCTAssertTrue(no.waitForExistence(timeout: 20), "NO button should be present on launch without login")

        // And they should become genuinely interactive (splash gone).
        XCTAssertTrue(waitUntilHittable(yes, timeout: 10), "YES button should be hittable")
        XCTAssertTrue(waitUntilHittable(no, timeout: 10), "NO button should be hittable")

        // Tapping an answer must not crash or require an account.
        yes.tap()
        XCTAssertTrue(app.buttons["Yes"].exists, "App should keep working after answering")
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
        XCTAssertTrue(app.buttons["Yes"].waitForExistence(timeout: 10), "App should be usable after skipping login")
    }

    // MARK: - Req 2 (UI): the default board renders Yes AND No together

    func testDefaultBoardRendersYesAndNo() {
        let yes = app.buttons["Yes"]
        let no = app.buttons["No"]
        XCTAssertTrue(yes.waitForExistence(timeout: 20), "The default 'Yes / No' set should render a Yes tile")
        XCTAssertTrue(no.waitForExistence(timeout: 20), "The default 'Yes / No' set should render a No tile")
        // Both are the board's two answers — present at the same time, no login.
        XCTAssertTrue(yes.exists && no.exists, "Yes and No must be shown together as the two-answer board")
    }

    // MARK: - Req 3 (UI): tapping either answer keeps the app usable (no login / crash)

    func testTappingNoAnswerKeepsAppUsable() {
        let no = app.buttons["No"]
        XCTAssertTrue(no.waitForExistence(timeout: 20), "NO button should be present on launch")
        XCTAssertTrue(waitUntilHittable(no, timeout: 10), "NO button should be hittable")
        no.tap()
        // Answering must not require an account or dismiss the board.
        XCTAssertTrue(app.buttons["No"].waitForExistence(timeout: 10), "App should keep working after answering NO")
        XCTAssertTrue(app.buttons["Yes"].exists, "The board should still be present after answering")
    }

    // MARK: - Req 6 / 7 (UI): a typed sentence can be entered and cleared

    func testTypedSentenceCanBeEnteredAndCleared() {
        // The board must be up first (splash gone).
        XCTAssertTrue(app.buttons["Yes"].waitForExistence(timeout: 20), "Board should be present")
        XCTAssertTrue(waitUntilHittable(app.buttons["Yes"], timeout: 10), "Board should be interactive")

        let field = element(withIdentifier: "YesNoSentenceField")
        XCTAssertTrue(field.waitForExistence(timeout: 10), "The sentence field should exist")
        XCTAssertTrue(waitUntilHittable(field, timeout: 5), "The sentence field should be hittable")
        field.tap()
        field.typeText("I want water")

        if let value = field.value as? String {
            XCTAssertTrue(value.contains("I want water"), "Typed sentence should be present in the field, was: \(value)")
        }

        // The clear button wipes the field back to its placeholder.
        let clear = element(withIdentifier: "YesNoClearSentenceButton")
        XCTAssertTrue(clear.waitForExistence(timeout: 5), "Clear button should exist")
        XCTAssertTrue(waitUntilHittable(clear, timeout: 5), "Clear button should be hittable")
        clear.tap()

        if let value = field.value as? String {
            XCTAssertFalse(value.contains("I want water"), "Sentence should be cleared, but field still read: \(value)")
        }
    }

    // MARK: - Req 12 (UI): question history starts empty

    func testHistoryActionShowsEmptyState() {
        // The board must be interactive (splash gone) before the header is tapped.
        XCTAssertTrue(app.buttons["Yes"].waitForExistence(timeout: 20), "Board should be present")
        XCTAssertTrue(waitUntilHittable(app.buttons["Yes"], timeout: 10), "Board should be interactive")

        // The history popup opens; with a reset (clean) launch it shows the empty state.
        let opened = tap(app.buttons["History"], until: app.staticTexts["Question history"])
        XCTAssertTrue(opened, "History popup should be presented")
        XCTAssertTrue(app.staticTexts["No questions yet"].waitForExistence(timeout: 5), "Fresh history should show its empty state")
    }

    // MARK: - Req 12 (UI): answering records the question and it can be re-selected

    func testAnsweringRecordsQuestionInHistory() {
        // The default sentence spoken/recorded when answering with an empty field.
        let recorded = "Do you want to go eat?"

        let yes = app.buttons["Yes"]
        XCTAssertTrue(yes.waitForExistence(timeout: 20), "YES button should be present")
        XCTAssertTrue(waitUntilHittable(yes, timeout: 10), "YES button should be hittable")
        yes.tap()
        settle(0.5)

        // Open the history popup (retry through the present animation).
        let opened = tap(app.buttons["History"], until: app.staticTexts["Question history"])
        XCTAssertTrue(opened, "History popup should be presented")

        // The just-answered question is now in history; re-select it. Retry the
        // tap through the popup's present animation until the popup dismisses.
        let recordedRow = button(containing: recorded)
        XCTAssertTrue(recordedRow.waitForExistence(timeout: 10), "Answering should record the question '\(recorded)' in history")
        settle(0.5)
        let historyTitle = app.staticTexts["Question history"]
        for _ in 0..<5 {
            if !historyTitle.exists { break }
            if recordedRow.exists, recordedRow.isHittable { recordedRow.tap() }
            if waitUntilGone(historyTitle, timeout: 3) { break }
            settle(0.4)
        }

        // Re-selecting it dismisses the popup and loads it back into the field.
        XCTAssertTrue(waitUntilGone(historyTitle, timeout: 10), "Selecting a question should close the history popup")
        let field = element(withIdentifier: "YesNoSentenceField")
        XCTAssertTrue(field.waitForExistence(timeout: 5), "The sentence field should exist")
        if let value = field.value as? String {
            XCTAssertTrue(value.contains(recorded), "Re-selected question should populate the sentence field, was: \(value)")
        }
    }

    // MARK: - Req 10 / 11 (UI): settings exposes the answer options

    func testSettingsShowsAnswerOptions() {
        // Board must be up (parent mode header) before settings is reachable.
        XCTAssertTrue(app.buttons["Yes"].waitForExistence(timeout: 20), "Board should be present")
        openSettings()

        XCTAssertTrue(app.staticTexts["Speak answers"].waitForExistence(timeout: 10), "Settings should offer a 'Speak answers' toggle")
        XCTAssertTrue(app.staticTexts["Answer style"].waitForExistence(timeout: 5), "Settings should offer 'Answer style'")
        XCTAssertTrue(app.staticTexts["Answer tiles"].waitForExistence(timeout: 5), "Settings should offer 'Answer tiles'")
        XCTAssertTrue(app.staticTexts["Label size"].waitForExistence(timeout: 5), "Settings should offer 'Label size'")
    }

    // NOTE: the answer-style picker (a second popup opened on top of the settings
    // popup) is intentionally NOT UI-tested. Presenting two stacked exyte
    // PopupView popups is unstable under the automation harness. The four styles
    // and their selectability are covered deterministically by the
    // `testChoiceStyleCatalog` unit test, and the settings-level entry point is
    // covered by `testSettingsShowsAnswerOptions` (the "Answer style" row).

    // MARK: - Small helpers

    /// The first text field that accepts editing (the email field in the login card).
    private func firstEditableTextField() -> XCUIElement {
        let byPlaceholder = app.textFields["you@example.com"]
        if byPlaceholder.exists { return byPlaceholder }
        return app.textFields.firstMatch
    }
}
