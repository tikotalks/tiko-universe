import XCTest

final class TikoFirstUITests: XCTestCase {
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

    func testLaunchShowsRoutineGrid() {
        let app = launchApp()
        XCTAssertTrue(app.buttons["first.routine.morning"].waitForExistence(timeout: 10), "the routine grid should appear after launch")
        XCTAssertTrue(app.buttons["first.routine.bedtime"].exists)
        XCTAssertTrue(app.buttons["first.routine.firstthen"].exists)
    }

    func testOpeningARoutineShowsTheCurrentStepAndItsControls() {
        let app = launchApp()
        let morning = app.buttons["first.routine.morning"]
        XCTAssertTrue(morning.waitForExistence(timeout: 10))
        morning.tap()

        XCTAssertTrue(app.buttons["first.step.current"].waitForExistence(timeout: 10), "the current step fills the screen")
        XCTAssertTrue(app.buttons["first.control.done"].exists, "the done button is always there")
        XCTAssertTrue(app.buttons["first.control.replay"].exists)
    }

    func testTickingAStepAdvancesToTheNextOne() {
        let app = launchApp()
        let morning = app.buttons["first.routine.morning"]
        XCTAssertTrue(morning.waitForExistence(timeout: 10))
        morning.tap()

        let current = app.buttons["first.step.current"]
        XCTAssertTrue(current.waitForExistence(timeout: 10))
        let firstLabel = current.label

        app.buttons["first.control.done"].tap()

        // The step card is reused, so wait for its label to change.
        let changed = expectation(description: "current step advanced")
        let check = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: true) { timer in
            if app.buttons["first.step.current"].exists, app.buttons["first.step.current"].label != firstLabel {
                timer.invalidate()
                changed.fulfill()
            }
        }
        wait(for: [changed], timeout: 15)
        check.invalidate()
    }

    func testFutureStepInTheStripCannotBeCompleted() {
        let app = launchApp()
        let morning = app.buttons["first.routine.morning"]
        XCTAssertTrue(morning.waitForExistence(timeout: 10))
        morning.tap()

        let current = app.buttons["first.step.current"]
        XCTAssertTrue(current.waitForExistence(timeout: 10))
        let firstLabel = current.label

        // The last strip item is the furthest-away step.
        let strip = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'first.strip.'"))
        XCTAssertGreaterThan(strip.count, 1)
        strip.element(boundBy: strip.count - 1).tap()

        // Previewing speaks it and changes nothing.
        Thread.sleep(forTimeInterval: 2)
        XCTAssertEqual(app.buttons["first.step.current"].label, firstLabel, "tapping ahead must never cross a step off")
    }

    /// Guideline 2.3.6: the age rating declares Parental Controls, so a
    /// reviewer with no account must be able to find them. Child Mode used to
    /// demand a verified email and dead-ended on "Verify your email".
    func testAGuestCanSetAParentPinAndEnterChildMode() {
        let app = launchApp()
        XCTAssertTrue(app.buttons["first.routine.morning"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Edit routines"].exists, "starts in parent mode")

        app.buttons["Account"].tap()
        let childMode = app.buttons["Child mode"]
        XCTAssertTrue(childMode.waitForExistence(timeout: 5), "the profile menu offers Child mode")
        childMode.tap()

        let newPin = app.textFields["tiko.parentPin.new"]
        XCTAssertTrue(newPin.waitForExistence(timeout: 5), "a guest reaches the PIN sheet, not an email wall")
        newPin.tap()
        newPin.typeText("1234")
        let confirmPin = app.textFields["tiko.parentPin.confirm"]
        confirmPin.tap()
        confirmPin.typeText("1234")
        app.buttons["tiko.parentPin.save"].tap()

        // Child mode hides every parent-facing header action.
        let editGone = expectation(description: "edit action hidden in child mode")
        let poll = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: true) { timer in
            if !app.buttons["Edit routines"].exists {
                timer.invalidate()
                editGone.fulfill()
            }
        }
        wait(for: [editGone], timeout: 15)
        poll.invalidate()

        // And the PIN is what gets back out.
        app.buttons["Account"].tap()
        let entry = app.textFields["tiko.parentPin.entry"]
        XCTAssertTrue(entry.waitForExistence(timeout: 5), "the account button asks for the PIN while in child mode")
        entry.tap()
        entry.typeText("1234")
        app.buttons["tiko.parentPin.submit"].tap()

        XCTAssertTrue(app.buttons["Edit routines"].waitForExistence(timeout: 15), "the correct PIN restores parent mode")
    }

    func testParentModeOpensRoutineEditor() {
        let app = launchApp()
        // Fresh temporary accounts open in Parent Mode, so the header action is
        // visible (the shell hides it in Child Mode).
        let editButton = app.buttons["Edit routines"]
        XCTAssertTrue(editButton.waitForExistence(timeout: 10), "parent mode should expose the edit-routines header action")
        editButton.tap()

        let listed = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Morning'")).firstMatch
        XCTAssertTrue(listed.waitForExistence(timeout: 10), "the routine manager should list the routines")
    }
}
