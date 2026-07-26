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

    /// Home → difficulty → operator → ten sums.
    private func startPresetGame(_ app: XCUIApplication, operatorID: String = "sum.op.plus") {
        let preset = app.buttons["sum.preset.to10"]
        XCTAssertTrue(preset.waitForExistence(timeout: 10))
        preset.tap()

        let op = app.buttons[operatorID]
        XCTAssertTrue(op.waitForExistence(timeout: 10), "the operator picker should follow the preset")
        op.tap()
    }

    func testHomeShowsDifficultyPresetsNotOperatorModes() {
        let app = launchApp()
        XCTAssertTrue(app.buttons["sum.preset.to10"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["sum.preset.to20"].exists)
        XCTAssertTrue(app.buttons["sum.preset.to50"].exists)
        XCTAssertTrue(app.buttons["sum.preset.to100"].exists)
        XCTAssertTrue(app.buttons["sum.home.freePlay"].exists)
    }

    func testPresetOffersEveryOperatorPlusMixed() {
        let app = launchApp()
        let preset = app.buttons["sum.preset.to20"]
        XCTAssertTrue(preset.waitForExistence(timeout: 10))
        preset.tap()

        XCTAssertTrue(app.buttons["sum.op.plus"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["sum.op.minus"].exists)
        XCTAssertTrue(app.buttons["sum.op.times"].exists)
        XCTAssertTrue(app.buttons["sum.op.dividedBy"].exists)
        XCTAssertTrue(app.buttons["sum.op.mixed"].exists, "one tile plays them all")
    }

    func testPresetGameDealsAnsweredSums() {
        let app = launchApp()
        startPresetGame(app)

        let tiles = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'sum.answer.'"))
        XCTAssertTrue(tiles.firstMatch.waitForExistence(timeout: 10), "answer tiles should be dealt")
        XCTAssertEqual(tiles.count, 3)
        XCTAssertTrue(app.buttons["sum.play.skip"].exists, "skip is always available")
    }

    func testSkippingTenSumsReachesTheEndScreen() {
        let app = launchApp()
        startPresetGame(app)

        let skip = app.buttons["sum.play.skip"]
        XCTAssertTrue(skip.waitForExistence(timeout: 10))
        for _ in 0..<10 where skip.exists {
            skip.tap()
        }

        XCTAssertTrue(app.buttons["sum.play.restart"].waitForExistence(timeout: 10), "the run should end on the end screen")
        XCTAssertTrue(app.buttons["sum.play.home"].exists, "with a way back home")
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
        XCTAssertTrue(app.buttons["Add path"].waitForExistence(timeout: 10), "the path manager should offer a new path")
    }
}
