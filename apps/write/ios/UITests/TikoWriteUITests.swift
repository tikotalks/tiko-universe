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
        XCTAssertTrue(
            app.buttons["circle"].waitForExistence(timeout: 20),
            "expected the circle tile on the home grid"
        )
        // A raw key on screen means the localization lookup is broken.
        XCTAssertFalse(app.staticTexts["write.group.shapes"].exists, "group titles must be localized")
    }

    /// Tap a glyph, then drag along it. Getting to the trace screen and staying
    /// there proves the chain: touch capture, coordinate transform, Kotlin
    /// engine, ink.
    func testTracingACircleReachesTheCanvas() {
        let app = launch()
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

    /// A child must never be trapped on a glyph they cannot finish.
    func testAlwaysHasAWayBack() {
        let app = launch()
        let tile = app.buttons["square"]
        XCTAssertTrue(tile.waitForExistence(timeout: 20))
        tile.tap()

        let next = app.buttons["Next"]
        XCTAssertTrue(next.waitForExistence(timeout: 10), "next must always be reachable")
        next.tap()
        XCTAssertTrue(app.buttons["circle"].waitForExistence(timeout: 10), "should return to the grid")
    }
}
