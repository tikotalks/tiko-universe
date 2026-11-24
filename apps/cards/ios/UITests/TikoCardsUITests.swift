import XCTest

/// Requirements-based UI tests for Tiko Cards.
///
/// The headline test — `testLoginPopupSurvivesEmailInput` — is the shared runtime
/// regression test for App Review rejection 2.1 ("app reverted back after
/// inputting an email"): the account/login popup was being dismissed on iPad when
/// the keyboard appeared during email entry. Tiko Cards uses the exact same
/// TikoKit account/login popup as Tiko Yes-No, so it inherits both the bug's risk
/// and the fix (the account popup is non-dismissible by keyboard / outside-tap /
/// drag — see `tikoAccountPopup` in TikoKit). This test drives the real UI and
/// asserts the login card stays present after the email field is tapped and typed
/// into.
///
/// The other tests assert the app is usable WITHOUT an account (a picture-card
/// collection grid is shown on launch), that "Skip for now" returns to the working
/// app, and the Cards-specific core flow: a collection opens and a picture card
/// inside it is present and tappable (tap-to-speak).
final class TikoCardsUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        // Launch in the app's deterministic, offline scene so the built-in card
        // collections are shown from `defaultCardCollections` without any network
        // dependency. This does not touch the account / login flow, which is what
        // the regression test exercises.
        app.launchArguments += ["--screenshot-mode", "--screenshot", "home"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Helpers

    /// Opens the account / login popup: tap the account avatar (opens the
    /// profile menu in parent mode), then tap "Profile" to reach the login card.
    private func openLoginCard() {
        let account = app.buttons["Account"]
        XCTAssertTrue(account.waitForExistence(timeout: 20), "Account button should exist on launch")
        // Splash overlay fades after ~1s; wait until the button is hittable.
        XCTAssertTrue(waitUntilHittable(account, timeout: 10), "Account button should become hittable")
        account.tap()

        let profileRow = app.buttons["Profile"]
        XCTAssertTrue(profileRow.waitForExistence(timeout: 10), "Profile menu should present a Profile row")
        XCTAssertTrue(waitUntilHittable(profileRow, timeout: 5), "Profile row should be hittable")
        profileRow.tap()
    }

    /// Poll for hittability (XCUIElement has no built-in wait-for-hittable).
    @discardableResult
    private func waitUntilHittable(_ element: XCUIElement, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if element.isHittable { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        return element.isHittable
    }

    @discardableResult
    private func waitUntilGone(_ element: XCUIElement, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if !element.exists { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        return !element.exists
    }

    /// Finds a tile / card by its accessibility identifier across the element
    /// types SwiftUI may vend it as (button, image, other, staticText).
    private func element(withIdentifier identifier: String) -> XCUIElement {
        let button = app.buttons[identifier]
        if button.exists { return button }
        let other = app.otherElements[identifier]
        if other.exists { return other }
        let image = app.images[identifier]
        if image.exists { return image }
        return app.descendants(matching: .any).matching(identifier: identifier).firstMatch
    }

    /// The login card is identified by its "Sign in" title, the "Send sign-in
    /// code" primary button, and the "Skip for now" action.
    private var loginCardTitle: XCUIElement { app.staticTexts["Sign in"] }
    private var sendCodeButton: XCUIElement { app.buttons["Send sign-in code"] }
    private var skipButton: XCUIElement { app.buttons["Skip for now"] }

    /// The first text field that accepts editing (the email field in the login card).
    private func firstEditableTextField() -> XCUIElement {
        let byPlaceholder = app.textFields["you@example.com"]
        if byPlaceholder.exists { return byPlaceholder }
        return app.textFields.firstMatch
    }

    // MARK: - Req 1 / 15: usable without an account

    func testAppIsUsableWithoutLogin() {
        // The built-in picture-card collections must be present on launch, with no
        // sign-in. "Animals" is one of the default collections.
        let animals = element(withIdentifier: "Animals")
        XCTAssertTrue(animals.waitForExistence(timeout: 20), "A collection ('Animals') should be present on launch without login")
        XCTAssertTrue(waitUntilHittable(animals, timeout: 10), "The collection tile should become hittable (splash gone)")

        // The account button is present (login is optional, not required).
        XCTAssertTrue(app.buttons["Account"].exists, "Account button should be present but login must not be required")
    }

    // MARK: - Req 3 / 17 (Cards core): a picture card is present and tappable

    func testCollectionOpensAndCardIsTappable() {
        // "Feelings" holds its cards directly.
        let feelings = element(withIdentifier: "Feelings")
        XCTAssertTrue(feelings.waitForExistence(timeout: 20), "Feelings collection should be present")
        XCTAssertTrue(waitUntilHittable(feelings, timeout: 10), "Feelings collection should be hittable")
        feelings.tap()

        // A picture card inside the collection must be present (e.g. "Happy") and
        // interactive — tapping it (tap-to-speak) must not crash or require login.
        let happy = element(withIdentifier: "Happy")
        XCTAssertTrue(happy.waitForExistence(timeout: 15), "A picture card ('Happy') should be present inside Feelings")
        XCTAssertTrue(waitUntilHittable(happy, timeout: 10), "The card should be hittable (tap-to-speak)")
        happy.tap()

        // The app keeps working after speaking a card.
        XCTAssertTrue(element(withIdentifier: "Happy").exists, "App should keep working after tapping a card")
    }

    // MARK: - Req 2: a collection renders its full set of picture cards

    func testCollectionRendersMultipleCards() {
        let feelings = element(withIdentifier: "Feelings")
        XCTAssertTrue(feelings.waitForExistence(timeout: 20), "Feelings collection should be present")
        XCTAssertTrue(waitUntilHittable(feelings, timeout: 10), "Feelings collection should be hittable")
        feelings.tap()

        // Several distinct cards from the bundled vocabulary must render.
        for title in ["Happy", "Sad", "Angry"] {
            let card = element(withIdentifier: title)
            XCTAssertTrue(card.waitForExistence(timeout: 15), "Card '\(title)' should render inside Feelings")
        }
    }

    // MARK: - Req 10: a category opens onto its sub-categories, and those onto cards

    func testCategoryOpensItsSubCategories() {
        let animals = element(withIdentifier: "Animals")
        XCTAssertTrue(animals.waitForExistence(timeout: 20), "Animals collection should be present")
        XCTAssertTrue(waitUntilHittable(animals, timeout: 10), "Animals collection should be hittable")
        animals.tap()

        // Animals is a shelf of smaller sets, not one long list.
        let pets = element(withIdentifier: "Pets")
        XCTAssertTrue(pets.waitForExistence(timeout: 15), "Animals should show its 'Pets' sub-category")
        XCTAssertTrue(element(withIdentifier: "Farm animals").exists, "Animals should show its 'Farm animals' sub-category")
        XCTAssertTrue(waitUntilHittable(pets, timeout: 10), "The sub-category should be hittable")
        pets.tap()

        let dog = element(withIdentifier: "Dog")
        XCTAssertTrue(dog.waitForExistence(timeout: 15), "Pets should show its cards ('Dog')")
        XCTAssertFalse(app.buttons["Cow"].exists, "A farm animal must not appear inside Pets")
    }

    // MARK: - Req 2 / 3: category navigation shows category-scoped cards

    /// Opening a *different* collection shows that collection's own cards and not
    /// another collection's — proving the grid is category-scoped, not a flat list.
    func testDifferentCollectionShowsItsOwnCards() {
        let body = element(withIdentifier: "Body")
        XCTAssertTrue(body.waitForExistence(timeout: 20), "Body collection should be present on launch")
        XCTAssertTrue(waitUntilHittable(body, timeout: 10), "Body collection should be hittable")
        body.tap()

        // Body's own cards are present…
        let head = element(withIdentifier: "Head")
        XCTAssertTrue(head.waitForExistence(timeout: 15), "A body card ('Head') should render inside Body")
        // …and a card from elsewhere is not shown inside Body.
        XCTAssertFalse(app.buttons["Happy"].exists, "A Feelings card ('Happy') must not appear inside the Body collection")
    }

    // MARK: - Food is shelves by meal, each with its own cards

    func testFoodOpensOntoMeals() {
        let food = element(withIdentifier: "Food")
        XCTAssertTrue(food.waitForExistence(timeout: 20), "Food collection should be present on launch")
        XCTAssertTrue(waitUntilHittable(food, timeout: 10), "Food collection should be hittable")
        food.tap()

        let breakfast = element(withIdentifier: "Breakfast")
        XCTAssertTrue(breakfast.waitForExistence(timeout: 15), "Food should show a 'Breakfast' shelf")
        XCTAssertTrue(element(withIdentifier: "Dinner").exists, "Food should show a 'Dinner' shelf")
        XCTAssertTrue(waitUntilHittable(breakfast, timeout: 10), "The shelf should be hittable")
        breakfast.tap()

        XCTAssertTrue(element(withIdentifier: "Pancakes").waitForExistence(timeout: 15), "Breakfast should show its cards ('Pancakes')")
    }

    // MARK: - Going back returns to the board one came from

    func testBackReturnsToTheParentBoard() {
        let animals = element(withIdentifier: "Animals")
        XCTAssertTrue(animals.waitForExistence(timeout: 20), "Animals collection should be present")
        XCTAssertTrue(waitUntilHittable(animals, timeout: 10), "Animals collection should be hittable")
        animals.tap()
        let pets = element(withIdentifier: "Pets")
        XCTAssertTrue(pets.waitForExistence(timeout: 15), "Animals should show 'Pets'")
        XCTAssertTrue(waitUntilHittable(pets, timeout: 10), "'Pets' should be hittable")
        pets.tap()
        XCTAssertTrue(element(withIdentifier: "Dog").waitForExistence(timeout: 15), "Pets should show 'Dog'")

        // The header icon is the way back, one board at a time.
        let back = app.buttons["Back"]
        XCTAssertTrue(back.waitForExistence(timeout: 5), "A board inside another shows a way back")
        back.tap()
        XCTAssertTrue(element(withIdentifier: "Farm animals").waitForExistence(timeout: 10), "Back from Pets is Animals")
        XCTAssertFalse(app.buttons["Dog"].exists, "Pets' cards are gone after going back")
        back.tap()
        XCTAssertTrue(element(withIdentifier: "Feelings").waitForExistence(timeout: 10), "Back from Animals is the root grid")
    }

    // MARK: - Search finds a card and a category from anywhere

    func testSearchFindsACardAndOpensACategory() {
        XCTAssertTrue(element(withIdentifier: "Feelings").waitForExistence(timeout: 20), "The root grid should be present")
        let search = app.buttons["Search"]
        XCTAssertTrue(search.waitForExistence(timeout: 10), "The header should offer Search")
        XCTAssertTrue(waitUntilHittable(search, timeout: 10), "Search should be hittable")
        search.tap()

        let field = app.textFields["CardsSearchField"]
        XCTAssertTrue(field.waitForExistence(timeout: 10), "Search should show its field")
        field.tap()
        field.typeText("pets")

        // The category is among the answers; opening it shows its cards.
        let pets = element(withIdentifier: "Pets")
        XCTAssertTrue(pets.waitForExistence(timeout: 10), "Searching 'pets' should find the Pets category")
        pets.tap()
        XCTAssertTrue(element(withIdentifier: "Dog").waitForExistence(timeout: 15), "Opening the found category shows its cards")

        // Back from a found category goes up to its parent, not straight home.
        let back = app.buttons["Back"]
        XCTAssertTrue(back.waitForExistence(timeout: 5), "A found category has a way back")
        back.tap()
        XCTAssertTrue(element(withIdentifier: "Farm animals").waitForExistence(timeout: 10), "Back from Pets is Animals")
    }

    // MARK: - Scroll mode shows a whole board in one scrolling grid

    func testScrollModeShowsEveryCategoryInOneGrid() {
        // Pages mode lays the board out as pages (on a phone the later
        // categories are swipes away; on an iPad they may all fit on one).
        XCTAssertTrue(element(withIdentifier: "Feelings").waitForExistence(timeout: 20), "The root grid should be present")
        XCTAssertFalse(app.scrollViews["CardsScrollBoard"].exists, "Pages mode is not a scrolling grid")

        // The setting is a stored preference; pass it the way the system does.
        app.terminate()
        app.launchArguments += ["-cards.layoutMode", "scroll"]
        app.launch()

        XCTAssertTrue(element(withIdentifier: "Feelings").waitForExistence(timeout: 20), "The root grid should be present")
        XCTAssertTrue(app.scrollViews["CardsScrollBoard"].waitForExistence(timeout: 10), "Scroll mode lays the board out as one scrolling grid")
        let letters = element(withIdentifier: "Letters")
        let from = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.75))
        let to = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2))
        for _ in 0..<8 where !(letters.exists && letters.isHittable) {
            from.press(forDuration: 0, thenDragTo: to, withVelocity: .fast, thenHoldForDuration: 0)
        }
        XCTAssertTrue(letters.exists && letters.isHittable, "A late category is reached in the one grid, by scrolling if it takes that")
    }

    // MARK: - Edit mode offers every card for editing, defaults included

    func testEditModeLetsADefaultCardBeEdited() {
        let feelings = element(withIdentifier: "Feelings")
        XCTAssertTrue(feelings.waitForExistence(timeout: 20), "Feelings collection should be present")
        XCTAssertTrue(waitUntilHittable(feelings, timeout: 10), "Feelings collection should be hittable")
        feelings.tap()
        let happy = element(withIdentifier: "Happy")
        XCTAssertTrue(happy.waitForExistence(timeout: 15), "Feelings should show 'Happy'")

        // A long press is how a parent enters edit mode.
        happy.press(forDuration: 1.0)
        XCTAssertTrue(app.buttons["Done"].waitForExistence(timeout: 10), "A long press should enter edit mode")

        // While editing, a tap on a card opens its editor instead of speaking
        // it — for a default card as much as for one of the family's own.
        XCTAssertTrue(app.buttons["Edit Happy"].waitForExistence(timeout: 5), "A default card should be marked as editable")
        happy.tap()
        XCTAssertTrue(app.staticTexts["Edit card"].waitForExistence(timeout: 10), "The card editor should open")
        // And it opens on this card, not on an empty page.
        let name = app.textFields.firstMatch
        XCTAssertTrue(name.waitForExistence(timeout: 5), "The editor should show the card's name field")
        XCTAssertEqual(name.value as? String, "Happy", "The editor should be filled in with the card being edited")
    }

    // MARK: - Req 17: REGRESSION — login popup survives email input

    func testLoginPopupSurvivesEmailInput() {
        openLoginCard()

        // The login card must be on screen.
        XCTAssertTrue(loginCardTitle.waitForExistence(timeout: 10), "Login card ('Sign in') should be presented")
        XCTAssertTrue(sendCodeButton.waitForExistence(timeout: 5), "Login card should show 'Send sign-in code'")

        // Find the email field, tap it (raises the keyboard) and type an email.
        let emailField = firstEditableTextField()
        XCTAssertTrue(emailField.waitForExistence(timeout: 5), "Email field should exist in the login card")
        XCTAssertTrue(waitUntilHittable(emailField, timeout: 5), "Email field should be hittable")
        emailField.tap()
        emailField.typeText("parent@example.com")

        // THE ASSERTION: after tapping + typing the email (keyboard shown), the
        // login card must STILL be present. Before the fix, the popup dismissed
        // here and the app "reverted back" — Apple's rejection.
        XCTAssertTrue(
            loginCardTitle.exists,
            "REGRESSION: the login card was dismissed after typing an email — the non-dismissible-popup fix is NOT working."
        )
        XCTAssertTrue(
            sendCodeButton.exists,
            "REGRESSION: the login card's primary button disappeared after email input — the fix is NOT working."
        )

        // The typed email should have registered in the field.
        if let value = emailField.value as? String {
            XCTAssertTrue(value.contains("parent@example.com"), "Typed email should be present in the field, was: \(value)")
        }
    }

    // MARK: - Req 16: "Skip for now" returns to the working app

    func testSkipForNowReturnsToUsableApp() {
        openLoginCard()
        XCTAssertTrue(skipButton.waitForExistence(timeout: 10), "Login card should offer 'Skip for now'")
        XCTAssertTrue(waitUntilHittable(skipButton, timeout: 5), "'Skip for now' should be hittable")
        skipButton.tap()

        // Popup dismissed → login card gone, app usable again.
        XCTAssertTrue(waitUntilGone(loginCardTitle, timeout: 10), "'Skip for now' should dismiss the login card")
        XCTAssertTrue(element(withIdentifier: "Animals").waitForExistence(timeout: 10), "App should be usable after skipping login")
    }
}
