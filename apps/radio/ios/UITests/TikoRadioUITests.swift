import XCTest

/// Requirements-based UI tests for Tiko Radio.
///
/// The headline test — `testLoginPopupSurvivesEmailInput` — is the shared runtime
/// regression test for App Review rejection 2.1 ("app reverted back after
/// inputting an email"): the account/login popup was being dismissed on iPad when
/// the keyboard appeared during email entry. Tiko Radio uses the exact same
/// TikoKit account/login popup as Tiko Yes-No, so it inherits both the bug's risk
/// and the fix (the account popup is non-dismissible by keyboard / outside-tap /
/// drag — see `tikoAccountPopup` in TikoKit). This test drives the real UI and
/// asserts the login card stays present after the email field is tapped and typed
/// into.
///
/// The other tests assert the app is usable WITHOUT an account (the collection grid
/// is shown on launch), that "Skip for now" returns to the working app, and the
/// Radio-specific core flow: opening a collection reveals its track tiles and
/// tapping a track shows the big playback controls.
final class TikoRadioUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        // Launch in the app's deterministic, offline scene so the collection grid
        // and sample tracks are populated from the built-in defaults without any
        // network dependency. This does not touch the account / login flow, which
        // is what the regression test exercises.
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

        // The profile menu is presented with an animation. Tap once, and if the
        // Profile row hasn't appeared (a tap dropped during the splash fade),
        // make a single recovery tap. Avoid polling `isHittable` on the account
        // avatar while the menu animates — its activation point is transiently
        // invalid mid-animation, which raises a hittability error.
        let profileRow = app.buttons["Profile"]
        account.tap()
        if !profileRow.waitForExistence(timeout: 10), account.exists {
            account.tap()
        }
        XCTAssertTrue(profileRow.waitForExistence(timeout: 10), "Profile menu should present a Profile row")
        // `tap()` waits for hittability internally, so no separate isHittable probe.
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

    /// Finds a tile / control by its accessibility identifier across the element
    /// types SwiftUI may vend it as (button, image, other, staticText).
    private func element(withIdentifier identifier: String) -> XCUIElement {
        let button = app.buttons[identifier]
        if button.exists { return button }
        let other = app.otherElements[identifier]
        if other.exists { return other }
        let image = app.images[identifier]
        if image.exists { return image }
        return app.descendants(matching: .any).matching(identifier: identifier).firstMatch
    }

    /// The login card is identified by its "Sign in" title, the "Send sign-in
    /// code" primary button, and the "Skip for now" action.
    private var loginCardTitle: XCUIElement { app.staticTexts["Sign in"] }
    private var sendCodeButton: XCUIElement { app.buttons["Send sign-in code"] }
    private var skipButton: XCUIElement { app.buttons["Skip for now"] }

    /// The first text field that accepts editing (the email field in the login card).
    private func firstEditableTextField() -> XCUIElement {
        let byPlaceholder = app.textFields["you@example.com"]
        if byPlaceholder.exists { return byPlaceholder }
        return app.textFields.firstMatch
    }

    // MARK: - Req 16: usable without an account

    func testAppIsUsableWithoutLogin() {
        // The built-in collection grid must be present on launch, with no sign-in.
        // "Music" is one of the default collections and holds sample tracks.
        let music = element(withIdentifier: "Music")
        XCTAssertTrue(music.waitForExistence(timeout: 20), "A collection ('Music') should be present on launch without login")
        XCTAssertTrue(waitUntilHittable(music, timeout: 10), "The collection tile should become hittable (splash gone)")

        // The account button is present (login is optional, not required).
        XCTAssertTrue(app.buttons["Account"].exists, "Account button should be present but login must not be required")
    }

    // MARK: - Req 10 / 16 (Radio core): open a collection → track → playback controls

    func testOpeningCollectionAndTrackShowsPlaybackControls() {
        // Open the "Music" collection.
        let music = element(withIdentifier: "Music")
        XCTAssertTrue(music.waitForExistence(timeout: 20), "Music collection should be present")
        XCTAssertTrue(waitUntilHittable(music, timeout: 10), "Music collection should be hittable")
        music.tap()

        // A sample track tile inside the collection must be present and tappable.
        let track = element(withIdentifier: "Go Go Dodo")
        XCTAssertTrue(track.waitForExistence(timeout: 15), "A track ('Go Go Dodo') should be present inside Music")
        XCTAssertTrue(waitUntilHittable(track, timeout: 10), "The track tile should be hittable")
        track.tap()

        // Opening the track shows the player detail with big playback controls.
        let playPause = element(withIdentifier: "PlayPause")
        XCTAssertTrue(playPause.waitForExistence(timeout: 15), "Playback controls (play / pause) should appear after opening a track")
        XCTAssertTrue(waitUntilHittable(playPause, timeout: 10), "The play / pause control should be hittable")
        // The app keeps working after toggling playback.
        playPause.tap()
        XCTAssertTrue(element(withIdentifier: "PlayPause").exists, "App should keep working after toggling playback")
    }

    /// Opens Music → the first sample track → the player detail, returning once
    /// the play/pause control is present and hittable.
    private func openMusicTrackPlayer() {
        let music = element(withIdentifier: "Music")
        XCTAssertTrue(music.waitForExistence(timeout: 20), "Music collection should be present")
        XCTAssertTrue(waitUntilHittable(music, timeout: 10), "Music collection should be hittable")

        // Retry the collection tap until its tracks appear — the LazyVGrid
        // occasionally needs a second tap when the first lands during the
        // splash fade under simulator load.
        var track = element(withIdentifier: "Go Go Dodo")
        for _ in 0..<5 {
            if music.isHittable { music.tap() }
            track = element(withIdentifier: "Go Go Dodo")
            if track.waitForExistence(timeout: 8) { break }
        }
        XCTAssertTrue(track.exists, "A track should be present inside Music")
        XCTAssertTrue(waitUntilHittable(track, timeout: 10), "The track tile should be hittable")

        // Retry opening the track until the player controls appear — under load
        // the first tap can be dropped while the collection view settles.
        var playPause = element(withIdentifier: "PlayPause")
        for _ in 0..<5 {
            if track.isHittable { track.tap() }
            playPause = element(withIdentifier: "PlayPause")
            if playPause.waitForExistence(timeout: 8) { break }
        }
        XCTAssertTrue(playPause.exists, "Playback controls should appear after opening a track")
        XCTAssertTrue(waitUntilHittable(playPause, timeout: 10), "Play / pause should be hittable")
    }

    // MARK: - Req 10 (Radio player): all five transport controls are present & distinct

    /// The player detail must vend all five playback controls under their own
    /// individual identifiers — this is the regression guard for the removed
    /// container-level "PlaybackControls" identifier that had collapsed them.
    func testPlayerShowsAllTransportControls() {
        openMusicTrackPlayer()
        for identifier in ["PreviousTrack", "PlayPause", "NextTrack", "ShuffleToggle", "RepeatToggle"] {
            let control = element(withIdentifier: identifier)
            XCTAssertTrue(control.waitForExistence(timeout: 10), "Control '\(identifier)' should be present in the player")
            XCTAssertTrue(waitUntilHittable(control, timeout: 10), "Control '\(identifier)' should be hittable")
        }
    }

    // MARK: - Req 11: next / previous keep the player usable

    func testNextAndPreviousTrackKeepPlayerVisible() {
        openMusicTrackPlayer()

        let next = element(withIdentifier: "NextTrack")
        XCTAssertTrue(next.waitForExistence(timeout: 10), "Next control should exist")
        next.tap()
        XCTAssertTrue(element(withIdentifier: "PlayPause").waitForExistence(timeout: 10), "Player stays after Next")

        let previous = element(withIdentifier: "PreviousTrack")
        XCTAssertTrue(previous.waitForExistence(timeout: 10), "Previous control should exist")
        previous.tap()
        XCTAssertTrue(element(withIdentifier: "PlayPause").waitForExistence(timeout: 10), "Player stays after Previous")
    }

    // MARK: - Req 12: shuffle / repeat toggles are interactive

    func testShuffleAndRepeatTogglesAreInteractive() {
        openMusicTrackPlayer()

        let shuffle = element(withIdentifier: "ShuffleToggle")
        XCTAssertTrue(shuffle.waitForExistence(timeout: 10), "Shuffle toggle should exist")
        XCTAssertTrue(waitUntilHittable(shuffle, timeout: 10), "Shuffle toggle should be hittable")
        shuffle.tap()

        let repeatToggle = element(withIdentifier: "RepeatToggle")
        XCTAssertTrue(repeatToggle.waitForExistence(timeout: 10), "Repeat toggle should exist")
        XCTAssertTrue(waitUntilHittable(repeatToggle, timeout: 10), "Repeat toggle should be hittable")
        repeatToggle.tap()

        // Toggling shuffle/repeat must not tear down the player.
        XCTAssertTrue(element(withIdentifier: "PlayPause").exists, "Player stays usable after toggling shuffle/repeat")
    }

    // MARK: - Req 5: a second collection opens and shows its own track

    func testOpeningAnimalsCollectionShowsItsTrack() {
        let animals = element(withIdentifier: "Animals")
        XCTAssertTrue(animals.waitForExistence(timeout: 20), "Animals collection should be present")
        XCTAssertTrue(waitUntilHittable(animals, timeout: 10), "Animals collection should be hittable")
        animals.tap()

        let track = element(withIdentifier: "Tomato Bird")
        XCTAssertTrue(track.waitForExistence(timeout: 15), "The Animals collection should list its sample track")
    }

    // MARK: - Req 10: "More in collection" navigates between tracks

    func testRelatedTrackNavigationSwitchesPlayer() {
        openMusicTrackPlayer()

        // The other Music sample track appears as a "More in collection" row.
        let related = app.buttons["Beatle Beast"]
        XCTAssertTrue(related.waitForExistence(timeout: 10), "A related track should be listed under the player")
        XCTAssertTrue(waitUntilHittable(related, timeout: 10), "The related track row should be hittable")
        related.tap()

        // The player now shows the newly selected track, controls intact.
        XCTAssertTrue(app.staticTexts["Beatle Beast"].waitForExistence(timeout: 10), "Player switches to the related track")
        XCTAssertTrue(element(withIdentifier: "PlayPause").exists, "Playback controls remain after switching track")
    }

    // MARK: - Req: settings popup exposes the shuffle & repeat toggles

    func testSettingsExposesShuffleAndRepeatToggles() {
        // Ensure the grid (and thus the parent-mode header) is loaded.
        let music = element(withIdentifier: "Music")
        XCTAssertTrue(music.waitForExistence(timeout: 20), "Home grid should be present")
        XCTAssertTrue(waitUntilHittable(music, timeout: 10), "Home grid should be interactive")

        let settings = app.buttons["Settings"]
        XCTAssertTrue(settings.waitForExistence(timeout: 10), "Settings button should be present in parent mode")
        XCTAssertTrue(waitUntilHittable(settings, timeout: 10), "Settings button should be hittable")

        // Retry opening the settings popup until its toggles appear.
        let shuffle = app.switches["Shuffle"]
        for _ in 0..<5 {
            if settings.isHittable { settings.tap() }
            if shuffle.waitForExistence(timeout: 8) { break }
        }
        XCTAssertTrue(shuffle.exists, "Settings should show a Shuffle toggle (persisted via AppStorage)")
        XCTAssertTrue(app.switches["Repeat"].waitForExistence(timeout: 8), "Settings should show a Repeat toggle (persisted via AppStorage)")
    }

    // MARK: - Req 18: REGRESSION — login popup survives email input

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

    // MARK: - Req 17: "Skip for now" returns to the working app

    func testSkipForNowReturnsToUsableApp() {
        openLoginCard()
        XCTAssertTrue(skipButton.waitForExistence(timeout: 10), "Login card should offer 'Skip for now'")
        XCTAssertTrue(waitUntilHittable(skipButton, timeout: 5), "'Skip for now' should be hittable")
        skipButton.tap()

        // Popup dismissed → login card gone, app usable again.
        XCTAssertTrue(waitUntilGone(loginCardTitle, timeout: 10), "'Skip for now' should dismiss the login card")
        XCTAssertTrue(element(withIdentifier: "Music").waitForExistence(timeout: 10), "App should be usable after skipping login")
    }
}
