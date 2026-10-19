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

    /// Free play sits at the very bottom of the home screen, below the ranges,
    /// the in-between bands, the number families and any saved paths. Those grids
    /// are lazy, so the tile does not exist until it is scrolled near — asserting
    /// on it without scrolling tests the scroll position, not the app.
    @discardableResult
    private func scrollToFreePlay(_ app: XCUIApplication) -> XCUIElement {
        let freePlay = app.buttons["sum.home.freePlay"]
        for _ in 0..<8 {
            if freePlay.exists { break }
            app.swipeUp()
        }
        XCTAssertTrue(freePlay.waitForExistence(timeout: 5), "free play should be reachable at the foot of the home screen")
        return freePlay
    }

    /// Home → pick the operator in the header → tap a mode → ten sums. There is
    /// no screen in between any more.
    private func startPresetGame(_ app: XCUIApplication, operatorID: String = "sum.op.plus") {
        let op = app.buttons[operatorID]
        XCTAssertTrue(op.waitForExistence(timeout: 10), "the operator lives in the home header")
        op.tap()

        let preset = app.buttons["sum.preset.to10"]
        XCTAssertTrue(preset.waitForExistence(timeout: 10))
        preset.tap()
    }

    func testHomeShowsTheWholeLadderOfModes() {
        let app = launchApp()
        XCTAssertTrue(app.buttons["sum.preset.to5"].waitForExistence(timeout: 10))
        for id in ["to5", "to10", "to20", "to50", "to100"] {
            XCTAssertTrue(app.buttons["sum.preset.\(id)"].exists, "range \(id) should be on the home grid")
        }
        scrollToFreePlay(app)
    }

    func testHomeShowsBandsAndNumberFamilies() {
        let app = launchApp()
        XCTAssertTrue(app.buttons["sum.preset.to5"].waitForExistence(timeout: 10))

        let band = app.buttons["sum.preset.band10to20"]
        XCTAssertTrue(band.exists, "the in-between bands should be offered too")

        // The families sit below the fold on smaller screens.
        let tens = app.buttons["sum.preset.family10"]
        if !tens.exists {
            app.swipeUp()
        }
        XCTAssertTrue(tens.waitForExistence(timeout: 5), "the 10s should be a mode of its own")
        XCTAssertTrue(app.buttons["sum.preset.family2"].exists, "so should the 2s")
        XCTAssertTrue(app.buttons["sum.preset.family5"].exists, "and the 5s")
    }

    func testTheHeaderOffersEveryOperatorPlusMixed() {
        let app = launchApp()
        XCTAssertTrue(app.buttons["sum.op.plus"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["sum.op.minus"].exists)
        XCTAssertTrue(app.buttons["sum.op.times"].exists)
        XCTAssertTrue(app.buttons["sum.op.dividedBy"].exists)
        XCTAssertTrue(app.buttons["sum.op.mixed"].exists, "one tab plays them all")
    }

    /// Whatever the child was practising is what they come back to.
    func testTheChosenOperatorIsRememberedAcrossLaunches() {
        let app = launchApp()
        let times = app.buttons["sum.op.times"]
        XCTAssertTrue(times.waitForExistence(timeout: 10))
        times.tap()
        XCTAssertTrue(times.isSelected, "the tapped operator should read as selected")

        // Relaunch without the reset flag so stored settings survive.
        app.terminate()
        let relaunched = XCUIApplication()
        relaunched.launch()
        let timesAgain = relaunched.buttons["sum.op.times"]
        XCTAssertTrue(timesAgain.waitForExistence(timeout: 10))
        XCTAssertTrue(timesAgain.isSelected, "× should still be the one in use")
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
        let freePlay = scrollToFreePlay(app)
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
        let freePlay = scrollToFreePlay(app)
        freePlay.tap()

        XCTAssertTrue(app.buttons["sum.key.plus"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["sum.key.minus"].exists, "minus should be available in free play")
        XCTAssertTrue(app.buttons["sum.key.times"].exists, "multiply should be available in free play")
        XCTAssertTrue(app.buttons["sum.key.dividedBy"].exists, "divide should be available in free play")
    }

    func testFreePlayMultiplyProducesAnswerTiles() {
        let app = launchApp()
        let freePlay = scrollToFreePlay(app)
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
        let freePlay = scrollToFreePlay(app)
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
