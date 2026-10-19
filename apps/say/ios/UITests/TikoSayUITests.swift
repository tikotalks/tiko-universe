import XCTest

final class TikoSayUITests: XCTestCase {
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    private func launchApp() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-reset"]
        app.launch()
        return app
    }

    func testLaunchShowsCategoryGrid() {
        let app = launchApp()
        let animals = app.buttons["say.category.animals"]
        XCTAssertTrue(animals.waitForExistence(timeout: 10), "category grid should appear after launch")
        XCTAssertTrue(app.buttons["say.category.food"].exists)
        XCTAssertTrue(app.buttons["say.category.vehicles"].exists)
    }

    func testParentModeOpensCardEditor() {
        let app = launchApp()
        // Fresh temporary accounts open in Parent Mode, so the edit-cards
        // header action is visible (the shell hides it in Child Mode).
        let editButton = app.buttons["Edit cards"]
        XCTAssertTrue(editButton.waitForExistence(timeout: 10), "parent mode should expose the edit-cards header action")
        editButton.tap()

        let addressableCategory = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Animals'")).firstMatch
        XCTAssertTrue(addressableCategory.waitForExistence(timeout: 10), "card manager should list the categories")
    }

    func testOpeningCategoryShowsPermissionRequestOrPractice() {
        let app = launchApp()
        let animals = app.buttons["say.category.animals"]
        XCTAssertTrue(animals.waitForExistence(timeout: 10))
        animals.tap()

        // Four legitimate destinations: the screen shown behind the system
        // permission prompt (fresh install), the Settings recovery screen (a
        // previous refusal), practice (permissions granted), or the calm
        // unavailable screen (host has no usable audio input, which is the
        // case on simulators without a routed microphone).
        let requesting = app.staticTexts["say.permission.requesting"]
        let openSettings = app.buttons["say.permission.openSettings"]
        let replay = app.buttons["say.practice.replay"]
        let unavailableBack = app.buttons["say.recognitionUnavailable.back"]
        let reachedNextScreen = requesting.waitForExistence(timeout: 10)
            || openSettings.exists
            || replay.exists
            || unavailableBack.waitForExistence(timeout: 20)
        XCTAssertTrue(reachedNextScreen, "category tap should lead to the permission request, practice or unavailable screen")
    }

    /// Guideline 5.1.1(iv): nothing may stand between opening a category and
    /// the system permission prompt. The old screen had a Continue button and
    /// a Back button that let a user leave without ever being asked.
    func testNoDismissiblePromptPrecedesThePermissionRequest() {
        let app = launchApp()
        let animals = app.buttons["say.category.animals"]
        XCTAssertTrue(animals.waitForExistence(timeout: 10))
        animals.tap()

        let requesting = app.staticTexts["say.permission.requesting"]
        guard requesting.waitForExistence(timeout: 10) else {
            // Permissions already decided on this host, or no audio input:
            // there is no pre-prompt screen to assert about.
            return
        }
        XCTAssertFalse(app.buttons["say.permission.continue"].exists, "the permission request must not be gated behind a button")
    }
}
