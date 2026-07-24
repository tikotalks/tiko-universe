import XCTest

/// Requirements-based UI tests for Tiko Timer.
///
/// The headline test — `testLoginPopupSurvivesEmailInput` — is the SHARED
/// runtime regression test for App Review rejection 2.1 ("app reverted back
/// after inputting an email"): the account/login popup was being dismissed on
/// iPad when the keyboard appeared during email entry. The fix made the account
/// popup non-dismissible by keyboard / outside-tap / drag (see `tikoAccountPopup`
/// in TikoKit, shared by every Tiko app). These tests drive the real UI and
/// assert the login card stays present after the email field is tapped and typed
/// into.
///
/// The remaining tests assert the timer is usable WITHOUT an account (the
/// countdown + presets are present on launch), that "Skip for now" returns to
/// the working app, and one Timer-specific flow: selecting a preset starts a
/// running countdown.
final class TikoTimerUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        // Launch in the app's deterministic, offline scene. This does not touch
        // the account / login flow, which is what the regression test exercises.
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
        XCTAssertTrue(account.waitForExistence(timeout: 25), "Account button should exist on launch")
        // Splash overlay fades after ~1s; taps land only once it is gone, so tap
        // (patiently retrying dropped taps) until the profile menu appears.
        let profileRow = app.buttons["Profile"]
        XCTAssertTrue(tapUntil(account, appears: profileRow), "Profile menu should present a Profile row")
        XCTAssertTrue(tapUntil(profileRow, appears: app.staticTexts["Sign in"]), "Tapping Profile should reveal the login card")
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

    /// Tap `control` (once hittable) and wait for `expected` to appear, retrying
    /// the tap a few times. SwiftUI occasionally drops the first tap while the
    /// launch/splash transition is still settling under simulator load; a lost
    /// tap otherwise leaves the app in its previous state and fails spuriously.
    @discardableResult
    private func tapUntil(_ control: XCUIElement, appears expected: XCUIElement, attempts: Int = 6) -> Bool {
        for _ in 0..<attempts {
            if expected.exists { return true }
            guard waitUntilHittable(control, timeout: 10), control.exists else { break }
            // Let any launch/splash overlay finish fading before tapping — while
            // it is still fading `isHittable` can be true yet the tap is eaten,
            // which is why the lower controls (Start) drop early taps.
            RunLoop.current.run(until: Date().addingTimeInterval(0.4))
            control.tap()
            if expected.waitForExistence(timeout: 6) { return true }
        }
        return expected.exists
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
    /// code" primary button, and the "Skip for now" action (all from TikoKit).
    private var loginCardTitle: XCUIElement { app.staticTexts["Sign in"] }
    private var sendCodeButton: XCUIElement { app.buttons["Send sign-in code"] }
    private var skipButton: XCUIElement { app.buttons["Skip for now"] }

    /// The first text field that accepts editing (the email field in the login card).
    private func firstEditableTextField() -> XCUIElement {
        let byPlaceholder = app.textFields["you@example.com"]
        if byPlaceholder.exists { return byPlaceholder }
        return app.textFields.firstMatch
    }

    // MARK: - Req 1 / 15: usable without an account

    func testAppIsUsableWithoutLogin() {
        // The countdown display and the preset buttons must be present on launch,
        // with no sign-in.
        let display = app.staticTexts["timer.display"]
        let firstPreset = app.buttons["timer.preset.0"]
        XCTAssertTrue(display.waitForExistence(timeout: 20), "Countdown display should be present on launch without login")
        XCTAssertTrue(firstPreset.waitForExistence(timeout: 20), "Preset buttons should be present on launch without login")

        // And a preset should become genuinely interactive (splash gone).
        XCTAssertTrue(waitUntilHittable(firstPreset, timeout: 10), "Preset button should be hittable")
    }

    // MARK: - Req 3: selecting a preset starts a running countdown (Timer-specific)

    func testSelectingPresetStartsCountdown() {
        let firstPreset = app.buttons["timer.preset.0"] // "1 min"
        XCTAssertTrue(firstPreset.waitForExistence(timeout: 20), "Preset button should exist")

        // Once running: pause + reset controls appear and the preset grid is gone.
        let pause = app.buttons["Pause"]
        XCTAssertTrue(tapUntil(firstPreset, appears: pause), "Selecting a preset should start the timer (Pause control appears)")
        XCTAssertTrue(app.buttons["Reset"].waitForExistence(timeout: 5), "A running timer should offer Reset")
        XCTAssertTrue(waitUntilGone(app.buttons["timer.preset.0"], timeout: 5), "Preset grid should hide once the timer is running")

        // The countdown display keeps showing time while running.
        XCTAssertTrue(app.staticTexts["timer.display"].exists, "Countdown display should remain visible while running")
    }

    // MARK: - Req 9 / 10: pause then resume keeps the timer running (Timer-specific)

    func testPauseThenResumeKeepsTimerRunning() {
        let firstPreset = app.buttons["timer.preset.0"]
        XCTAssertTrue(firstPreset.waitForExistence(timeout: 20), "Preset button should exist")

        // Running → Pause is offered.
        let pause = app.buttons["timer.pause"]
        XCTAssertTrue(tapUntil(firstPreset, appears: pause), "A running timer should offer Pause")
        XCTAssertTrue(waitUntilHittable(pause, timeout: 5), "Pause should be hittable")
        pause.tap()

        // Paused → Resume replaces Pause; Reset stays; display remains.
        let resume = app.buttons["timer.resume"]
        XCTAssertTrue(resume.waitForExistence(timeout: 10), "Pausing should offer Resume")
        XCTAssertTrue(waitUntilGone(app.buttons["timer.pause"], timeout: 5), "Pause should be replaced by Resume while paused")
        XCTAssertTrue(app.buttons["timer.reset"].exists, "Reset should stay available while paused")
        XCTAssertTrue(app.staticTexts["timer.display"].exists, "Countdown display should remain visible while paused")

        // Resume → back to running (Pause returns, Resume gone).
        XCTAssertTrue(waitUntilHittable(resume, timeout: 5), "Resume should be hittable")
        resume.tap()
        XCTAssertTrue(app.buttons["timer.pause"].waitForExistence(timeout: 10), "Resuming should return to the running state (Pause returns)")
        XCTAssertTrue(waitUntilGone(app.buttons["timer.resume"], timeout: 5), "Resume should be gone once running again")
    }

    // MARK: - Req 12: reset returns the timer to idle (presets reappear) (Timer-specific)

    func testResetReturnsTimerToIdle() {
        let firstPreset = app.buttons["timer.preset.0"]
        XCTAssertTrue(firstPreset.waitForExistence(timeout: 20), "Preset button should exist")

        // Running — the preset grid is hidden.
        let reset = app.buttons["timer.reset"]
        XCTAssertTrue(tapUntil(firstPreset, appears: reset), "A running timer should offer Reset")
        XCTAssertTrue(waitUntilGone(app.buttons["timer.preset.0"], timeout: 5), "Preset grid should hide while running")
        XCTAssertTrue(waitUntilHittable(reset, timeout: 5), "Reset should be hittable")
        reset.tap()

        // Idle again — presets reappear and Pause/Resume/Reset controls are gone.
        XCTAssertTrue(app.buttons["timer.preset.0"].waitForExistence(timeout: 10), "Reset should return to idle so the preset grid reappears")
        XCTAssertTrue(waitUntilGone(app.buttons["timer.pause"], timeout: 5), "Pause control should be gone once idle")
        XCTAssertTrue(app.buttons["timer.start"].exists, "The Start (custom) control should be present again while idle")
    }

    // MARK: - Req 13: the Start control begins a custom countdown (Timer-specific)

    func testCustomStartControlStartsCountdown() {
        // While idle the play/Start control (custom duration) is present.
        let start = app.buttons["timer.start"]
        XCTAssertTrue(start.waitForExistence(timeout: 20), "The Start (custom) control should be present while idle")

        // Starting switches to running: Pause + Reset appear, presets hide.
        XCTAssertTrue(tapUntil(start, appears: app.buttons["timer.pause"]), "The Start control should begin a running countdown (Pause appears)")
        XCTAssertTrue(app.buttons["timer.reset"].exists, "A running custom timer should offer Reset")
        XCTAssertTrue(waitUntilGone(app.buttons["timer.preset.0"], timeout: 5), "Preset grid should hide once the custom timer is running")
        XCTAssertTrue(app.staticTexts["timer.display"].exists, "Countdown display should remain visible while running")
    }

    // MARK: - Req 17: REGRESSION — login popup survives email input (SHARED)

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
        XCTAssertTrue(app.staticTexts["timer.display"].waitForExistence(timeout: 10), "App should be usable after skipping login")
    }
}
