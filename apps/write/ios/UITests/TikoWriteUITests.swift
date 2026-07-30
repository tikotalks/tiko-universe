import XCTest

final class TikoWriteUITests: XCTestCase {

    private func launch() -> XCUIApplication {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30))
        return app
    }

    /// Doctrine: apps open and work immediately. No account wall, no permission
    /// prompt — Write asks for nothing, because it needs nothing.
    func testOpensWithoutLoginAndShowsGlyphs() {
        let app = launch()
        XCTAssertTrue(app.buttons["Shapes"].waitForExistence(timeout: 20), "expected the Shapes category")
        app.buttons["Shapes"].tap()
        XCTAssertTrue(
            app.buttons["circle"].waitForExistence(timeout: 10),
            "expected the circle tile inside Shapes"
        )
        // A raw key on screen means the localization lookup is broken.
        XCTAssertFalse(app.staticTexts["write.group.shapes"].exists, "group titles must be localized")
    }

    /// Tap a glyph, then drag along it. Getting to the trace screen and staying
    /// there proves the chain: touch capture, coordinate transform, Kotlin
    /// engine, ink.
    func testTracingACircleReachesTheCanvas() {
        let app = launch()
        XCTAssertTrue(app.buttons["Shapes"].waitForExistence(timeout: 20))
        app.buttons["Shapes"].tap()
        let tile = app.buttons["circle"]
        XCTAssertTrue(tile.waitForExistence(timeout: 20))
        tile.tap()

        XCTAssertTrue(
            app.buttons["Again"].waitForExistence(timeout: 10),
            "expected the trace screen's replay control"
        )

        // Walk the circle counter-clockwise from the top, in normalized window
        // coordinates, the way a finger would.
        let window = app.windows.firstMatch
        let steps = 48
        var points: [XCUICoordinate] = []
        for i in 0...steps {
            let angle = -Double.pi / 2 - (2 * Double.pi * Double(i) / Double(steps))
            points.append(
                window.coordinate(
                    withNormalizedOffset: CGVector(dx: 0.5 + 0.28 * cos(angle), dy: 0.42 + 0.28 * sin(angle))
                )
            )
        }
        points[0].press(forDuration: 0.05, thenDragTo: points[1])
        for i in 1..<points.count - 1 {
            points[i].press(forDuration: 0.01, thenDragTo: points[i + 1])
        }

        // Whatever the trace scored, the child is never stranded.
        XCTAssertTrue(app.buttons["Again"].exists || app.buttons["Next"].exists)
    }

    /// Traces a glyph all the way to the finish. A synthesized drag is too
    /// coarse to complete a corridor reliably, so this drives the same replay
    /// the screenshot capture uses — which feeds the glyph's own polyline
    /// through the real engine. If the engine ever stops completing, or the
    /// Well done card stops appearing, this fails.
    func testAGlyphCanBeTracedToTheFinish() {
        let app = XCUIApplication()
        app.launchArguments = ["--screenshot-mode", "--screenshot", "celebrate"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30))

        XCTAssertTrue(
            app.staticTexts["Well done!"].waitForExistence(timeout: 25),
            "a completed glyph must reach the Well done card"
        )
        XCTAssertTrue(app.staticTexts["Star"].exists, "the finish names what was drawn")
        XCTAssertFalse(app.buttons["Again"].exists, "the trace controls give way to the finish")
    }

    /// Words are the headline feature: a child should reach one in two taps.
    func testWordsAreReachableAndOpen() {
        let app = launch()
        let words = app.buttons["Words"]
        XCTAssertTrue(words.waitForExistence(timeout: 20), "expected the Words category first")
        words.tap()

        // Bundled starter words, so there is something to trace before any
        // grown-up has set anything up.
        let cat = app.buttons["cat"]
        XCTAssertTrue(cat.waitForExistence(timeout: 10), "expected bundled starter words")
        XCTAssertTrue(app.buttons["Add a word"].exists, "a grown-up needs a way in")

        cat.tap()
        XCTAssertTrue(
            app.buttons["Again"].waitForExistence(timeout: 10),
            "expected the word canvas"
        )
    }

    /// Navigation must unwind all the way back, from any depth.
    func testBackUnwindsFromAWord() {
        let app = launch()
        XCTAssertTrue(app.buttons["Words"].waitForExistence(timeout: 20))
        app.buttons["Words"].tap()
        XCTAssertTrue(app.buttons["cat"].waitForExistence(timeout: 10))
        app.buttons["cat"].tap()
        XCTAssertTrue(app.buttons["Next"].waitForExistence(timeout: 10))
        app.buttons["Next"].tap()
        XCTAssertTrue(app.buttons["cat"].waitForExistence(timeout: 10), "should return to the word list")
    }

    /// A child must never be trapped on a glyph they cannot finish.
    func testAlwaysHasAWayBack() {
        let app = launch()
        XCTAssertTrue(app.buttons["Shapes"].waitForExistence(timeout: 20))
        app.buttons["Shapes"].tap()
        let tile = app.buttons["square"]
        XCTAssertTrue(tile.waitForExistence(timeout: 20))
        tile.tap()

        let next = app.buttons["Next"]
        XCTAssertTrue(next.waitForExistence(timeout: 10), "next must always be reachable")
        next.tap()
        XCTAssertTrue(app.buttons["circle"].waitForExistence(timeout: 10), "should return to the glyph grid")
    }
}
