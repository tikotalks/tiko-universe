import XCTest
@testable import TikoSay

@MainActor
final class SayCardStoreTests: XCTestCase {
    private var defaults: UserDefaults!
    private var suiteName: String!

    override func setUp() {
        super.setUp()
        suiteName = "say-store-tests-\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        super.tearDown()
    }

    private func makeStore(subject: String = "subject-a") -> SayCardStore {
        SayCardStore(defaults: defaults, subjectIDProvider: { subject })
    }

    // MARK: - Resolution

    func testDefaultsResolveForLanguage() {
        let store = makeStore()
        let en = store.visibleCards(categoryID: "animals", language: "en")
        let nl = store.visibleCards(categoryID: "animals", language: "nl")
        XCTAssertEqual(en.count, 10)
        XCTAssertEqual(en.first { $0.id == "animal_dog" }?.title, "Dog")
        XCTAssertEqual(nl.first { $0.id == "animal_dog" }?.title, "Hond")
    }

    func testUnknownLanguageFallsBackToEnglish() {
        let store = makeStore()
        let cards = store.visibleCards(categoryID: "animals", language: "ja")
        XCTAssertEqual(cards.first { $0.id == "animal_dog" }?.title, "Dog")
    }

    func testRegionalLanguageCodeNormalizes() {
        let store = makeStore()
        let cards = store.visibleCards(categoryID: "animals", language: "nl-BE")
        XCTAssertEqual(cards.first { $0.id == "animal_dog" }?.title, "Hond")
    }

    // MARK: - Overrides

    func testOverrideChangesFieldsIndependently() {
        let store = makeStore()
        store.updateCard(
            id: "animal_dog", language: "en",
            title: "Puppy", speakText: "the puppy", listenFor: ["puppy", "pup"], emoji: "🐶"
        )
        let card = store.visibleCards(categoryID: "animals", language: "en").first { $0.id == "animal_dog" }!
        XCTAssertEqual(card.title, "Puppy")
        XCTAssertEqual(card.speakText, "the puppy")
        XCTAssertEqual(card.listenFor, ["puppy", "pup"])
        XCTAssertTrue(store.isEdited(cardID: "animal_dog", language: "en"))
    }

    func testEmptySpeakAndListenPrefillFromTitle() {
        let store = makeStore()
        store.updateCard(id: "animal_dog", language: "en", title: "Puppy", speakText: "  ", listenFor: [" ", ""], emoji: "🐶")
        let card = store.visibleCards(categoryID: "animals", language: "en").first { $0.id == "animal_dog" }!
        XCTAssertEqual(card.speakText, "Puppy")
        XCTAssertEqual(card.listenFor, ["puppy"])
    }

    func testOverridesAreScopedPerLanguage() {
        let store = makeStore()
        store.updateCard(id: "animal_dog", language: "en", title: "Puppy", speakText: "puppy", listenFor: ["puppy"], emoji: "🐶")
        let nlCard = store.visibleCards(categoryID: "animals", language: "nl").first { $0.id == "animal_dog" }!
        XCTAssertEqual(nlCard.title, "Hond", "an English edit must not touch Dutch defaults")
        XCTAssertFalse(store.isEdited(cardID: "animal_dog", language: "nl"))
    }

    func testResetRestoresBundledValues() {
        let store = makeStore()
        store.updateCard(id: "animal_dog", language: "en", title: "Puppy", speakText: "puppy", listenFor: ["puppy"], emoji: "🐕")
        store.resetToDefault(cardID: "animal_dog", language: "en")
        let card = store.visibleCards(categoryID: "animals", language: "en").first { $0.id == "animal_dog" }!
        XCTAssertEqual(card.title, "Dog")
        XCTAssertEqual(card.listenFor, ["dog", "doggy"])
        XCTAssertFalse(store.isEdited(cardID: "animal_dog", language: "en"))
    }

    func testSavingUnchangedValuesIsNotAnEdit() {
        let store = makeStore()
        let original = store.visibleCards(categoryID: "animals", language: "en").first { $0.id == "animal_dog" }!
        store.updateCard(
            id: "animal_dog", language: "en",
            title: original.title, speakText: original.speakText,
            listenFor: original.listenFor, emoji: original.emoji
        )
        XCTAssertFalse(store.isEdited(cardID: "animal_dog", language: "en"))
    }

    // MARK: - Hiding

    func testHiddenCardsExcludedFromPractice() {
        let store = makeStore()
        store.setHidden(true, cardID: "animal_dog", language: "en")
        XCTAssertFalse(store.visibleCards(categoryID: "animals", language: "en").contains { $0.id == "animal_dog" })
        XCTAssertTrue(store.allCards(categoryID: "animals", language: "en").contains { $0.id == "animal_dog" })
        // Other languages unaffected.
        XCTAssertTrue(store.visibleCards(categoryID: "animals", language: "nl").contains { $0.id == "animal_dog" })
    }

    func testAllHiddenCategoryIsUnplayable() {
        let store = makeStore()
        for card in store.allCards(categoryID: "animals", language: "en") {
            store.setHidden(true, cardID: card.id, language: "en")
        }
        XCTAssertFalse(store.isCategoryPlayable(categoryID: "animals", language: "en"))
        XCTAssertTrue(store.isCategoryPlayable(categoryID: "food", language: "en"))
    }

    // MARK: - Custom cards

    func testCustomCardLifecycle() {
        let store = makeStore()
        let card = store.addCustomCard(categoryID: "animals", language: "en", title: "Horse")
        XCTAssertNotNil(card)
        XCTAssertEqual(card?.speakText, "Horse", "speak text prefills from title")
        XCTAssertEqual(card?.listenFor, ["horse"], "listen-for prefills from title")
        XCTAssertTrue(card!.isCustom)

        store.updateCard(id: card!.id, language: "en", title: "Pony", speakText: "a pony", listenFor: ["pony"], emoji: "🐴")
        var cards = store.visibleCards(categoryID: "animals", language: "en")
        XCTAssertEqual(cards.first { $0.id == card!.id }?.title, "Pony")

        store.deleteCustomCard(id: card!.id, language: "en")
        cards = store.visibleCards(categoryID: "animals", language: "en")
        XCTAssertFalse(cards.contains { $0.id == card!.id })
    }

    func testCustomCardsAreScopedPerLanguage() {
        let store = makeStore()
        store.addCustomCard(categoryID: "animals", language: "en", title: "Horse")
        XCTAssertFalse(store.visibleCards(categoryID: "animals", language: "nl").contains { $0.title == "Horse" })
    }

    func testDefaultCardsCannotBeDeleted() {
        let store = makeStore()
        store.deleteCustomCard(id: "animal_dog", language: "en")
        XCTAssertTrue(store.visibleCards(categoryID: "animals", language: "en").contains { $0.id == "animal_dog" })
    }

    func testEmptyTitleRejectedForCustomCard() {
        let store = makeStore()
        XCTAssertNil(store.addCustomCard(categoryID: "animals", language: "en", title: "   "))
    }

    // MARK: - Reorder

    func testReorderPersistsAcrossCards() {
        let store = makeStore()
        let before = store.allCards(categoryID: "animals", language: "en").map(\.id)
        store.moveCard(categoryID: "animals", language: "en", fromOffsets: IndexSet(integer: 0), toOffset: 3)
        let after = store.allCards(categoryID: "animals", language: "en").map(\.id)
        XCTAssertNotEqual(before, after)
        XCTAssertEqual(Set(before), Set(after))
    }

    // MARK: - Persistence

    func testEditsSurviveRelaunch() {
        let store = makeStore()
        store.updateCard(id: "animal_dog", language: "en", title: "Puppy", speakText: "puppy", listenFor: ["puppy"], emoji: "🐶")
        store.addCustomCard(categoryID: "food", language: "en", title: "Cheese")
        store.setHidden(true, cardID: "animal_cat", language: "en")

        // Fresh store over the same defaults = app relaunch.
        let relaunched = makeStore()
        XCTAssertEqual(
            relaunched.visibleCards(categoryID: "animals", language: "en").first { $0.id == "animal_dog" }?.title,
            "Puppy"
        )
        XCTAssertTrue(relaunched.visibleCards(categoryID: "food", language: "en").contains { $0.title == "Cheese" })
        XCTAssertFalse(relaunched.visibleCards(categoryID: "animals", language: "en").contains { $0.id == "animal_cat" })
    }

    func testEditsAreScopedPerAccountSubject() {
        let storeA = makeStore(subject: "subject-a")
        storeA.updateCard(id: "animal_dog", language: "en", title: "Puppy", speakText: "puppy", listenFor: ["puppy"], emoji: "🐶")

        let storeB = makeStore(subject: "subject-b")
        XCTAssertEqual(
            storeB.visibleCards(categoryID: "animals", language: "en").first { $0.id == "animal_dog" }?.title,
            "Dog"
        )
    }
}
