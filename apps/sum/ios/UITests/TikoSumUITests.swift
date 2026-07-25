import XCTest

final class TikoSumUITests: XCTestCase {
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

    func testLaunchShowsHomeGrid() {
        let app = launchApp()
        XCTAssertTrue(app.buttons["sum.home.freePlay"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["sum.path.counting"].exists)
        XCTAssertTrue(app.buttons["sum.path.shares"].exists)
    }

    func testFreePlayKeypadProducesAnswerTiles() {
        let app = launchApp()
        let freePlay = app.buttons["sum.home.freePlay"]
        XCTAssertTrue(freePlay.waitForExistence(timeout: 10))
        freePlay.tap()

        XCTAssertTrue(app.buttons["sum.key.3"].waitForExistence(timeout: 10))
        app.buttons["sum.key.3"].tap()
        app.buttons["sum.key.plus"].tap()
        app.buttons["sum.key.5"].tap()
        app.buttons["sum.key.equals"].tap()

        XCTAssertTrue(app.buttons["sum.answer.8"].waitForExistence(timeout: 10), "answer tiles should include the correct value")
        app.buttons["sum.answer.8"].tap()
    }

    func testParentModeOpensPathEditor() {
        let app = launchApp()
        let editButton = app.buttons["Edit paths"]
        XCTAssertTrue(editButton.waitForExistence(timeout: 10), "parent mode should expose the edit-paths header action")
        editButton.tap()
        let addressable = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Counting'")).firstMatch
        XCTAssertTrue(addressable.waitForExistence(timeout: 10), "path manager should list the paths")
    }
}
