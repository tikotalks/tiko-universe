import XCTest

/// The promises the product makes on launch: an Earth, straight away, with no
/// login — and a route to every country that needs no gestures at all.
final class TikoGlobeUITests: XCTestCase {
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

    func testTheAppOpensStraightOntoTheEarth() {
        let app = launchApp()
        let globe = app.otherElements["globe-surface"]
        XCTAssertTrue(globe.waitForExistence(timeout: 20), "the globe should be on screen without any sign-in step")
        XCTAssertFalse(app.buttons["Send sign-in code"].exists, "Globe asks for no account")
    }

    func testTheCountryListSelectsSpeaksAndShowsACard() {
        let app = launchApp()
        XCTAssertTrue(app.otherElements["globe-surface"].waitForExistence(timeout: 20))

        app.buttons["All countries"].tap()
        let list = app.otherElements["globe-country-list"]
        XCTAssertTrue(list.waitForExistence(timeout: 10), "the list is the route that needs no globe gestures")

        let malta = app.buttons["globe-country-MLT"]
        if !malta.exists {
            app.textFields["globe-list-search"].tap()
            app.textFields["globe-list-search"].typeText("Malta")
        }
        XCTAssertTrue(malta.waitForExistence(timeout: 10))
        malta.tap()

        let card = app.otherElements["globe-selection-card"]
        XCTAssertTrue(card.waitForExistence(timeout: 10), "picking a country should open its card")
        XCTAssertTrue(app.staticTexts["Malta"].exists)
        XCTAssertTrue(app.buttons["Say it again"].exists, "the name must always be repeatable")
    }

    func testTappingTheGlobeSelectsWhatIsUnderTheFinger() {
        let app = launchApp()
        let globe = app.otherElements["globe-surface"]
        XCTAssertTrue(globe.waitForExistence(timeout: 20))
        XCTAssertFalse(app.otherElements["globe-selection-card"].exists, "nothing is selected on launch")

        // The opening view is centred on north Africa, so the middle of the
        // globe is land — one tap, no zooming, no menu.
        globe.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()

        let card = app.otherElements["globe-selection-card"]
        XCTAssertTrue(card.waitForExistence(timeout: 10), "a tap on land should open that country's card")
        XCTAssertTrue(app.buttons["Say it again"].exists)

        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "selected-country"
        shot.lifetime = .keepAlways
        add(shot)
    }

    func testTheZoomButtonsWorkWithoutPinching() {
        let app = launchApp()
        XCTAssertTrue(app.otherElements["globe-surface"].waitForExistence(timeout: 20))

        let zoomIn = app.buttons["globe-zoom-in"]
        let zoomOut = app.buttons["globe-zoom-out"]
        XCTAssertTrue(zoomIn.waitForExistence(timeout: 10), "zooming must not depend on knowing that pinch exists")
        XCTAssertTrue(zoomIn.isHittable, "the zoom controls must not sit behind anything")
        XCTAssertFalse(zoomOut.isEnabled, "at the whole Earth there is nothing to zoom out to")

        zoomIn.tap()
        XCTAssertTrue(app.buttons["Whole Earth"].waitForExistence(timeout: 10), "the + button zoomed in")
        XCTAssertTrue(zoomOut.isEnabled)

        zoomOut.tap()
        XCTAssertTrue(waitUntilGone(app.buttons["Whole Earth"], timeout: 10), "the − button zoomed back out")
    }

    func testZoomingInOffersTheWayBackToTheWholeEarth() {
        let app = launchApp()
        let globe = app.otherElements["globe-surface"]
        XCTAssertTrue(globe.waitForExistence(timeout: 20))
        XCTAssertFalse(app.buttons["Whole Earth"].exists, "there is nothing to go back to yet")

        globe.pinch(withScale: 4, velocity: 4)
        XCTAssertTrue(
            app.buttons["Whole Earth"].waitForExistence(timeout: 10),
            "zoomed in, the child needs one obvious way back out"
        )

        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "pinched-in"
        shot.lifetime = .keepAlways
        add(shot)
        app.buttons["Whole Earth"].tap()
        XCTAssertTrue(waitUntilGone(app.buttons["Whole Earth"], timeout: 10), "back at the whole Earth it is not needed")
    }

    func testZoomedInSelectionStaysInView() {
        let app = launchApp()
        let globe = app.otherElements["globe-surface"]
        XCTAssertTrue(globe.waitForExistence(timeout: 20))

        globe.pinch(withScale: 3, velocity: 3)
        globe.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)).tap()
        XCTAssertTrue(
            app.otherElements["globe-selection-card"].waitForExistence(timeout: 10),
            "a tap while zoomed in should still select what is under it"
        )

        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "zoomed-selection"
        shot.lifetime = .keepAlways
        add(shot)
    }

    func testEveryModeIsReachableAndKeepsTheCameraWhereItWas() {
        let app = launchApp()
        XCTAssertTrue(app.otherElements["globe-surface"].waitForExistence(timeout: 20))

        for mode in ["countries", "capitals", "animals", "landmarks"] {
            let button = app.buttons["globe-mode-\(mode)"]
            XCTAssertTrue(button.waitForExistence(timeout: 10), "\(mode) should be one tap away")
            button.tap()
        }

        // Animals: the markers are drawn into the globe canvas for speed, so the
        // list is the route a test — and a VoiceOver user — takes to them.
        app.buttons["globe-mode-animals"].tap()
        app.buttons["All countries"].tap()
        let listed = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'globe-list-animal.'")).firstMatch
        XCTAssertTrue(listed.waitForExistence(timeout: 10), "animals should be reachable from the list")
        let animalName = listed.label
        listed.tap()

        XCTAssertTrue(app.otherElements["globe-selection-card"].waitForExistence(timeout: 10))
        XCTAssertTrue(
            app.staticTexts[animalName].waitForExistence(timeout: 5),
            "picking \(animalName) should open \(animalName)"
        )

        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "animals-mode"
        shot.lifetime = .keepAlways
        add(shot)
    }

    func testLandmarksModeStandsThemOnTheGlobe() {
        let app = launchApp()
        XCTAssertTrue(app.otherElements["globe-surface"].waitForExistence(timeout: 20))
        app.buttons["globe-mode-landmarks"].tap()
        app.buttons["All countries"].tap()
        let listed = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'globe-list-landmark.'")).firstMatch
        XCTAssertTrue(listed.waitForExistence(timeout: 10), "landmarks should be reachable from the list")
        let name = listed.label
        listed.tap()
        XCTAssertTrue(app.otherElements["globe-selection-card"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts[name].waitForExistence(timeout: 5), "picking \(name) should open \(name)")

        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "landmarks-mode"
        shot.lifetime = .keepAlways
        add(shot)
    }

    private func waitUntilGone(_ element: XCUIElement, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if !element.exists { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        return !element.exists
    }
}
