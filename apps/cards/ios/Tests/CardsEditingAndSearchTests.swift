import XCTest
import TikoKit
@testable import TikoCards

/// Editing the default cards, and finding cards by a typed word.
final class CardsEditingAndSearchTests: XCTestCase {

    @MainActor
    private func makeStore() throws -> (CardsStore, UserDefaults, String) {
        let suiteName = "TikoCardsEditing.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        return (CardsStore(defaults: defaults), defaults, suiteName)
    }

    private func card(_ id: String, in store: CardsStore) -> CommunicationCard? {
        MainActor.assumeIsolated {
            store.collections.lazy.flatMap(\.cards).first { $0.id == id }
        }
    }

    // MARK: - Editing a default card (Req 11)

    /// A parent renames a default card. It stays renamed the next time the app
    /// opens, with no account and no server to have saved it.
    @MainActor
    func testEditedDefaultCardSurvivesARelaunch() throws {
        let (store, defaults, suiteName) = try makeStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }
        store.loadOfflineDefaults()

        store.updateCard(
            id: "__default_family_mom", title: "Mama", speech: "Mama",
            color: "pink", fitzgeraldCategory: "person",
            imageURL: URL(string: "https://example.org/our-mama.jpg"),
            inCollectionID: "__default_family"
        )

        let relaunched = CardsStore(defaults: defaults)
        relaunched.loadOfflineDefaults()
        let mama = try XCTUnwrap(card("__default_family_mom", in: relaunched))
        XCTAssertEqual(mama.title, "Mama")
        XCTAssertEqual(mama.color, "pink")
        XCTAssertEqual(relaunched.imageURL(for: mama)?.absoluteString, "https://example.org/our-mama.jpg")
    }

    /// The edit is laid over the vocabulary, not written into it: every other
    /// card still follows the language, and the card keeps its place.
    @MainActor
    func testAnEditLeavesTheRestOfTheVocabularyAlone() throws {
        let (store, defaults, suiteName) = try makeStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }
        store.loadOfflineDefaults()
        let before = try XCTUnwrap(store.collections.first { $0.id == "__default_family" }).cards.map(\.id)

        store.updateCard(
            id: "__default_family_dad", title: "Papa Jan", speech: "Papa Jan",
            color: "orange", imageURL: nil, inCollectionID: "__default_family"
        )

        let dutch = CardsStore(defaults: defaults)
        dutch.loadOfflineDefaults(languageCode: "nl")
        let family = try XCTUnwrap(dutch.collections.first { $0.id == "__default_family" })
        XCTAssertEqual(family.cards.map(\.id), before, "the edited card keeps its place")
        XCTAssertEqual(family.cards.first { $0.id == "__default_family_dad" }?.title, "Papa Jan")
        XCTAssertEqual(family.cards.first { $0.id == "__default_family_mom" }?.title, "Mama", "untouched cards still translate")
        XCTAssertEqual(family.title, "Familie")
    }

    /// Taking a default card away takes it off this device only, and stays so.
    @MainActor
    func testRemovedDefaultCardStaysRemoved() throws {
        let (store, defaults, suiteName) = try makeStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }
        store.loadOfflineDefaults()

        store.deleteCard(id: "__default_pets_mouse", inCollectionID: "__default_pets")

        let relaunched = CardsStore(defaults: defaults)
        relaunched.loadOfflineDefaults()
        XCTAssertNil(card("__default_pets_mouse", in: relaunched))
        XCTAssertNotNil(card("__default_pets_dog", in: relaunched))
    }

    @MainActor
    func testRenamedDefaultCollectionSurvivesARelaunch() throws {
        let (store, defaults, suiteName) = try makeStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }
        store.loadOfflineDefaults()

        store.updateCollection(id: "__default_pets", title: "Our pets", color: "teal", imageURL: nil)

        let relaunched = CardsStore(defaults: defaults)
        relaunched.loadOfflineDefaults()
        let pets = try XCTUnwrap(relaunched.collections.first { $0.id == "__default_pets" })
        XCTAssertEqual(pets.title, "Our pets")
        XCTAssertEqual(pets.color, "teal")
        XCTAssertEqual(pets.parentID, "__default_animals", "it is still where it was")
    }

    /// Restore defaults undoes every change to the default cards and leaves the
    /// family's own cards alone.
    @MainActor
    func testRestoreDefaultsUndoesEditsButKeepsOwnCards() throws {
        let (store, _, suiteName) = try makeStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }
        store.loadOfflineDefaults()
        store.addCollection(title: "My Set", color: "blue")
        store.updateCard(id: "__default_family_mom", title: "Mama", speech: "Mama", color: "pink", imageURL: nil, inCollectionID: "__default_family")
        store.deleteCard(id: "__default_pets_mouse", inCollectionID: "__default_pets")
        XCTAssertTrue(store.hasLocalEditsToDefaults)

        store.restoreDefaults(languageCode: "en")

        XCTAssertFalse(store.hasLocalEditsToDefaults)
        XCTAssertEqual(card("__default_family_mom", in: store)?.title, "Mom")
        XCTAssertNotNil(card("__default_pets_mouse", in: store))
        XCTAssertTrue(store.collections.contains { $0.title == "My Set" })
    }

    /// A family's own card keeps the picture chosen for it, without a server.
    @MainActor
    func testOwnCardKeepsItsPictureAcrossARelaunch() throws {
        let (store, defaults, suiteName) = try makeStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }
        store.loadOfflineDefaults()
        store.addCollection(title: "My Set", color: "blue")
        let setID = try XCTUnwrap(store.collections.first { $0.title == "My Set" }?.id)
        store.addCard(title: "Our dog", speech: "Our dog", imageURL: URL(string: "https://example.org/rex.jpg"), to: setID)

        let relaunched = CardsStore(defaults: defaults)
        relaunched.loadOfflineDefaults()
        let own = try XCTUnwrap(relaunched.collections.first { $0.id == setID }?.cards.first)
        XCTAssertEqual(relaunched.imageURL(for: own)?.absoluteString, "https://example.org/rex.jpg")
    }

    // MARK: - The edits model

    func testEditsWithNothingInThemChangeNothing() {
        XCTAssertEqual(CardsLocalEdits().applied(to: defaultCardCollections), defaultCardCollections)
    }

    func testRemovingACollectionRemovesWhatIsInsideIt() {
        var edits = CardsLocalEdits()
        edits.removedCollections = ["__default_animals"]
        let ids = Set(edits.applied(to: defaultCardCollections).map(\.id))
        XCTAssertFalse(ids.contains("__default_animals"))
        XCTAssertFalse(ids.contains("__default_pets"), "a sub-category goes with its parent")
        XCTAssertTrue(ids.contains("__default_food"))
    }

    // MARK: - Search

    private func titles(_ query: String, in collections: [CardCollection] = defaultCardCollections) -> [String] {
        CardsSearch.results(for: query, in: collections).map { hit in
            switch hit.kind {
            case .collection(let collection): "[\(collection.title)]"
            case .card(let card): card.title
            }
        }
    }

    func testSearchFindsACardByItsWord() {
        XCTAssertEqual(titles("dog").first, "Dog")
        XCTAssertTrue(titles("dog").contains("Hotdog"), "a word inside a longer one is still found, after the exact one")
    }

    func testSearchListsACategoryBeforeCardsThatMatchEquallyWell() {
        let found = titles("pets")
        XCTAssertEqual(found.first, "[Pets]")
    }

    func testSearchFindsHalfTypedWords() {
        let found = titles("ban")
        XCTAssertTrue(found.contains("Banana"))
        XCTAssertTrue(found.contains("Bandage"))
    }

    func testSearchIgnoresCaseAndAccents() {
        XCTAssertEqual(titles("CAFE").first, "Cafe")
        let dutch = CardsDefaults.collections(languageCode: "nl")
        XCTAssertTrue(titles("cafe", in: dutch).contains("Café"))
        XCTAssertTrue(titles("ijs", in: dutch).contains("IJsje"))
    }

    func testSearchReadsWhatACardSays() {
        XCTAssertTrue(titles("need").contains("Help"), "'Help' says 'I need help'")
    }

    /// Milk is filed under Breakfast and under Drinks; it is one answer.
    func testSearchDoesNotRepeatTheSameThing() {
        XCTAssertEqual(titles("milk").filter { $0 == "Milk" }.count, 1)
    }

    func testAnEmptySearchFindsNothing() {
        XCTAssertTrue(titles("   ").isEmpty)
        XCTAssertTrue(titles("zzzzqq").isEmpty)
    }
}
