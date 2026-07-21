import XCTest
import TikoKit
@testable import TikoCards

final class TikoCardsTests: XCTestCase {
    func testDefaultCollectionsMatchWebCardsCategories() {
        XCTAssertEqual(defaultCardCollections.map(\.id), [
            "__default_animals",
            "__default_food",
            "__default_snacks",
            "__default_drinks",
            "__default_colors",
            "__default_emotions",
            "__default_transport",
            "__default_body",
            "__default_numbers",
            "__default_letters",
            "__default_actions",
            "__default_people",
            "__default_places",
            "__default_clothing",
            "__default_nature",
        ])
    }

    func testDefaultCollectionsContainSpeakableCards() {
        XCTAssertEqual(defaultCardCollections.count, 15)
        XCTAssertGreaterThan(defaultCardCollections.flatMap(\.cards).count, 180)
        XCTAssertTrue(defaultCardCollections.allSatisfy { !$0.cards.isEmpty })
        XCTAssertTrue(defaultCardCollections.flatMap(\.cards).allSatisfy { !$0.speech.isEmpty })
    }

    func testDefaultCollectionsRoundTripJSON() throws {
        let data = try JSONEncoder().encode(defaultCardCollections)
        let decoded = try JSONDecoder().decode([CardCollection].self, from: data)
        XCTAssertEqual(decoded, defaultCardCollections)
    }

    func testMediaCategoryMapMatchesWebCardsContract() {
        let animals = defaultCardCollections.first { $0.id == "__default_animals" }
        XCTAssertEqual(animals?.mediaCategories, ["animals"])
        let food = defaultCardCollections.first { $0.id == "__default_food" }
        XCTAssertEqual(food?.mediaCategories, ["food"])
        let emotions = defaultCardCollections.first { $0.id == "__default_emotions" }
        XCTAssertEqual(emotions?.mediaCategories, ["emotions", "feelings"])
        let letters = defaultCardCollections.first { $0.id == "__default_letters" }
        XCTAssertEqual(letters?.mediaCategories, ["letters", "alphabet"])
    }

    func testCDNURLUsesImageResizingForTikoUploads() throws {
        let source = try XCTUnwrap(URL(string: "https://data.tikocdn.org/uploads/cards/dog.png"))
        let resized = CardsMediaMatcher.resizedCDNURL(source)
        XCTAssertEqual(resized.absoluteString, "https://data.tikocdn.org/cdn-cgi/image/width=300,quality=80,f=auto/uploads/cards/dog.png")
    }

    func testContentEditingAccessAllowsAdminRolesAndCapability() {
        let subject = TikoIdentitySubject(id: "subject-1")

        XCTAssertTrue(CardsView.hasContentEditingAccess(TikoIdentityBundle(subject: subject, roles: ["admin"])))
        XCTAssertTrue(CardsView.hasContentEditingAccess(TikoIdentityBundle(subject: subject, roles: ["content_editor"])))
        XCTAssertTrue(CardsView.hasContentEditingAccess(TikoIdentityBundle(
            subject: subject,
            capabilities: TikoUserCapabilities(canEditContent: true)
        )))
        XCTAssertFalse(CardsView.hasContentEditingAccess(TikoIdentityBundle(subject: subject, roles: ["profile_manager"])))
        XCTAssertFalse(CardsView.hasContentEditingAccess(nil))
    }

    @MainActor
    func testUserCollectionPersistsAcrossStoreInstances() async throws {
        let suiteName = "TikoCardsTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }

        let firstStore = CardsStore(defaults: defaults)
        firstStore.addCollection(title: "My collection", color: "green")

        let secondStore = CardsStore(defaults: defaults)
        await secondStore.load(languageCode: "en")

        XCTAssertTrue(secondStore.collections.contains { collection in
            collection.id.hasPrefix("user_") &&
            collection.title == "My collection" &&
            collection.color == "green"
        })
    }

    // MARK: - Colour fallbacks (Req 4)

    /// Req 4: an unknown colour on a card or collection falls back to a valid
    /// default ("orange") so every tile is always renderable.
    func testUnknownColorFallsBackToDefault() {
        let card = CommunicationCard(id: "x", title: "X", speech: "X", color: "not-a-real-color")
        XCTAssertEqual(card.color, "orange")
        let collection = CardCollection(id: "c", title: "C", color: "definitely-bogus", order: 0, cards: [])
        XCTAssertEqual(collection.color, "orange")
    }

    /// Req 7: a card round-trips losslessly through Codable, preserving its
    /// colour, image ref and order.
    func testCardColorRoundTrips() throws {
        let card = CommunicationCard(id: "c1", title: "Cat", speech: "Cat", imageRef: "abc-123", color: "green", order: 2)
        let data = try JSONEncoder().encode(card)
        let decoded = try JSONDecoder().decode(CommunicationCard.self, from: data)
        XCTAssertEqual(decoded, card)
        XCTAssertEqual(decoded.color, "green")
    }

    // MARK: - Custom content: collections & cards (Req 8, 9, 10)

    /// Creates a `CardsStore` backed by an isolated, empty UserDefaults suite so
    /// custom-content tests never touch real app state. The caller is responsible
    /// for removing the suite (see each test's `defer`).
    @MainActor
    private func makeIsolatedStore() throws -> (CardsStore, String) {
        let suiteName = "TikoCardsTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        return (CardsStore(defaults: defaults), suiteName)
    }

    /// Req 8: adding a collection creates a locally-owned `user_…` collection with
    /// the requested title and colour — no account required.
    @MainActor
    func testAddCollectionCreatesUserCollection() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Vehicles", color: "blue")

        let created = store.collections.first { $0.title == "Vehicles" }
        XCTAssertNotNil(created)
        XCTAssertTrue(created?.id.hasPrefix("user_") == true)
        XCTAssertEqual(created?.color, "blue")
    }

    /// Req 9: adding a card appends it to the target collection with its title and
    /// spoken text.
    @MainActor
    func testAddCardAppendsToCollection() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Toys", color: "green")
        let collectionID = try XCTUnwrap(store.collections.first { $0.title == "Toys" }?.id)
        store.addCard(title: "Ball", speech: "Ball", color: "red", to: collectionID)

        let collection = store.collections.first { $0.id == collectionID }
        XCTAssertEqual(collection?.cards.count, 1)
        XCTAssertEqual(collection?.cards.first?.title, "Ball")
        XCTAssertEqual(collection?.cards.first?.speech, "Ball")
    }

    /// Req 3 / 9: a custom card added with blank spoken text falls back to its
    /// title, so tap-to-speak always has something to say.
    @MainActor
    func testAddedCardSpeechFallsBackToTitle() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Toys", color: "green")
        let collectionID = try XCTUnwrap(store.collections.first { $0.title == "Toys" }?.id)
        store.addCard(title: "Teddy", speech: "   ", color: "red", to: collectionID)

        let card = store.collections.first { $0.id == collectionID }?.cards.first
        XCTAssertEqual(card?.speech, "Teddy")
    }

    /// Req 10: collections can be nested — a collection created with a parent keeps
    /// that `parentID`.
    @MainActor
    func testAddNestedCollectionKeepsParent() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Parent", color: "green")
        let parentID = try XCTUnwrap(store.collections.first { $0.title == "Parent" }?.id)
        store.addCollection(title: "Child", color: "blue", parentID: parentID)

        let child = store.collections.first { $0.title == "Child" }
        XCTAssertEqual(child?.parentID, parentID)
    }
}
