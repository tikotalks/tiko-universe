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

    func testFreePlayOffersAllFourOperators() {
        let app = launchApp()
        let freePlay = app.buttons["sum.home.freePlay"]
        XCTAssertTrue(freePlay.waitForExistence(timeout: 10))
        freePlay.tap()

        XCTAssertTrue(app.buttons["sum.key.plus"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["sum.key.minus"].exists, "minus should be available in free play")
        XCTAssertTrue(app.buttons["sum.key.times"].exists, "multiply should be available in free play")
        XCTAssertTrue(app.buttons["sum.key.dividedBy"].exists, "divide should be available in free play")
    }

    func testFreePlayMultiplyProducesAnswerTiles() {
        let app = launchApp()
        let freePlay = app.buttons["sum.home.freePlay"]
        XCTAssertTrue(freePlay.waitForExistence(timeout: 10))
        freePlay.tap()

        XCTAssertTrue(app.buttons["sum.key.3"].waitForExistence(timeout: 10))
        app.buttons["sum.key.3"].tap()
        app.buttons["sum.key.times"].tap()
        app.buttons["sum.key.4"].tap()
        app.buttons["sum.key.equals"].tap()

        XCTAssertTrue(app.buttons["sum.answer.12"].waitForExistence(timeout: 10), "multiply should produce answer tiles with the product")
    }

    func testFreePlayDivideProducesAnswerTiles() {
        let app = launchApp()
        let freePlay = app.buttons["sum.home.freePlay"]
        XCTAssertTrue(freePlay.waitForExistence(timeout: 10))
        freePlay.tap()

        XCTAssertTrue(app.buttons["sum.key.1"].waitForExistence(timeout: 10))
        app.buttons["sum.key.1"].tap()
        app.buttons["sum.key.2"].tap()
        app.buttons["sum.key.dividedBy"].tap()
        app.buttons["sum.key.3"].tap()
        app.buttons["sum.key.equals"].tap()

        XCTAssertTrue(app.buttons["sum.answer.4"].waitForExistence(timeout: 10), "exact division should produce answer tiles with the quotient")
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
