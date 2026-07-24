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

    func testOpeningCategoryShowsPermissionExplanationOrPractice() {
        let app = launchApp()
        let animals = app.buttons["say.category.animals"]
        XCTAssertTrue(animals.waitForExistence(timeout: 10))
        animals.tap()

        // Fresh installs land on the parent-facing permission explanation;
        // simulators with granted permissions go straight to practice.
        let permissionContinue = app.buttons["say.permission.continue"]
        let openSettings = app.buttons["say.permission.openSettings"]
        let replay = app.buttons["say.practice.replay"]
        let reachedNextScreen = permissionContinue.waitForExistence(timeout: 10)
            || openSettings.exists
            || replay.exists
        XCTAssertTrue(reachedNextScreen, "category tap should lead to permission explanation or practice screen")
    }
}
