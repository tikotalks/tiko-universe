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

    // MARK: - Offline defaults loading (Req 1 / 15)

    /// The deterministic offline path used by UI tests / screenshots populates the
    /// full built-in catalogue synchronously, with no network or session.
    @MainActor
    func testLoadOfflineDefaultsPopulatesBuiltInCatalogue() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        XCTAssertTrue(store.collections.isEmpty)
        store.loadOfflineDefaults()

        XCTAssertEqual(store.collections.count, defaultCardCollections.count)
        XCTAssertEqual(
            store.collections.map(\.id),
            defaultCardCollections.sorted { $0.order < $1.order }.map(\.id)
        )
        XCTAssertTrue(store.collections.contains { $0.id == "__default_animals" && $0.title == "Animals" })
    }

    /// Offline defaults are merged with any locally-owned user collections that
    /// were persisted earlier (so custom content survives an offline launch).
    @MainActor
    func testLoadOfflineDefaultsMergesLocalUserCollections() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "My Set", color: "blue")
        store.loadOfflineDefaults()

        XCTAssertTrue(store.collections.contains { $0.title == "My Set" && $0.id.hasPrefix("user_") })
        XCTAssertTrue(store.collections.contains { $0.id == "__default_food" })
    }

    // MARK: - Editing cards & collections (Req 9 / 11)

    @MainActor
    func testUpdateCardChangesTitleSpeechAndColor() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Toys", color: "green")
        let cid = try XCTUnwrap(store.collections.first { $0.title == "Toys" }?.id)
        store.addCard(title: "Ball", speech: "Ball", color: "red", to: cid)
        let cardID = try XCTUnwrap(store.collections.first { $0.id == cid }?.cards.first?.id)

        store.updateCard(id: cardID, title: "Red Ball", speech: "A red ball", color: "blue", imageURL: nil, inCollectionID: cid)

        let card = try XCTUnwrap(store.collections.first { $0.id == cid }?.cards.first { $0.id == cardID })
        XCTAssertEqual(card.title, "Red Ball")
        XCTAssertEqual(card.speech, "A red ball")
        XCTAssertEqual(card.color, "blue")
    }

    @MainActor
    func testUpdateCollectionChangesTitleAndColor() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Vehicles", color: "blue")
        let cid = try XCTUnwrap(store.collections.first { $0.title == "Vehicles" }?.id)

        store.updateCollection(id: cid, title: "Cars", color: "red", imageURL: nil)

        let collection = try XCTUnwrap(store.collections.first { $0.id == cid })
        XCTAssertEqual(collection.title, "Cars")
        XCTAssertEqual(collection.color, "red")
    }

    // MARK: - Removing cards & collections (Req 11)

    @MainActor
    func testDeleteCardRemovesItFromCollection() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Toys", color: "green")
        let cid = try XCTUnwrap(store.collections.first { $0.title == "Toys" }?.id)
        store.addCard(title: "Ball", speech: "Ball", color: "red", to: cid)
        store.addCard(title: "Kite", speech: "Kite", color: "red", to: cid)
        let ballID = try XCTUnwrap(store.collections.first { $0.id == cid }?.cards.first { $0.title == "Ball" }?.id)

        store.deleteCard(id: ballID, inCollectionID: cid)

        let cards = try XCTUnwrap(store.collections.first { $0.id == cid }?.cards)
        XCTAssertEqual(cards.map(\.title), ["Kite"])
    }

    @MainActor
    func testDeleteCollectionRemovesIt() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Vehicles", color: "blue")
        let cid = try XCTUnwrap(store.collections.first { $0.title == "Vehicles" }?.id)

        store.deleteCollection(id: cid)

        XCTAssertFalse(store.collections.contains { $0.id == cid })
    }

    @MainActor
    func testDeleteCardsRemovesOnlySelected() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Toys", color: "green")
        let cid = try XCTUnwrap(store.collections.first { $0.title == "Toys" }?.id)
        for name in ["A", "B", "C"] { store.addCard(title: name, speech: name, color: "red", to: cid) }
        let cards = try XCTUnwrap(store.collections.first { $0.id == cid }?.cards)
        let toDelete = Set(cards.filter { $0.title == "A" || $0.title == "C" }.map(\.id))

        store.deleteCards(ids: toDelete, fromCollectionID: cid)

        let remaining = try XCTUnwrap(store.collections.first { $0.id == cid }?.cards)
        XCTAssertEqual(remaining.map(\.title), ["B"])
    }

    // MARK: - Moving, recolouring & reparenting (Req 11 / 12)

    @MainActor
    func testMoveCardsBetweenCollections() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Source", color: "green")
        store.addCollection(title: "Target", color: "blue")
        let sourceID = try XCTUnwrap(store.collections.first { $0.title == "Source" }?.id)
        let targetID = try XCTUnwrap(store.collections.first { $0.title == "Target" }?.id)
        store.addCard(title: "Ball", speech: "Ball", color: "red", to: sourceID)
        let ballID = try XCTUnwrap(store.collections.first { $0.id == sourceID }?.cards.first?.id)

        store.moveCards(ids: [ballID], fromCollectionID: sourceID, toCollectionID: targetID)

        XCTAssertTrue(store.collections.first { $0.id == sourceID }?.cards.isEmpty == true)
        XCTAssertEqual(store.collections.first { $0.id == targetID }?.cards.map(\.title), ["Ball"])
    }

    @MainActor
    func testRecolorCardsAppliesColorToSelection() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Toys", color: "green")
        let cid = try XCTUnwrap(store.collections.first { $0.title == "Toys" }?.id)
        store.addCard(title: "A", speech: "A", color: "red", to: cid)
        store.addCard(title: "B", speech: "B", color: "red", to: cid)
        let ids = Set(try XCTUnwrap(store.collections.first { $0.id == cid }?.cards).map(\.id))

        store.recolorCards(ids: ids, inCollectionID: cid, color: "purple")

        let cards = try XCTUnwrap(store.collections.first { $0.id == cid }?.cards)
        XCTAssertTrue(cards.allSatisfy { $0.color == "purple" })
    }

    @MainActor
    func testReparentCollectionsMovesThemUnderNewParent() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Parent", color: "green")
        store.addCollection(title: "Loose", color: "blue")
        let parentID = try XCTUnwrap(store.collections.first { $0.title == "Parent" }?.id)
        let looseID = try XCTUnwrap(store.collections.first { $0.title == "Loose" }?.id)

        store.reparentCollections(ids: [looseID], toParentID: parentID)

        XCTAssertEqual(store.collections.first { $0.id == looseID }?.parentID, parentID)
    }

    // MARK: - Reordering (Req 12)

    @MainActor
    func testReorderCardMovesCardWithinCollection() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Toys", color: "green")
        let cid = try XCTUnwrap(store.collections.first { $0.title == "Toys" }?.id)
        for name in ["A", "B", "C"] { store.addCard(title: name, speech: name, color: "red", to: cid) }
        let cards = try XCTUnwrap(store.collections.first { $0.id == cid }?.cards)
        let a = try XCTUnwrap(cards.first { $0.title == "A" }?.id)
        let c = try XCTUnwrap(cards.first { $0.title == "C" }?.id)

        // Drag "A" onto "C" — "A" should end up after its original neighbours.
        store.reorderCard(draggingID: a, targetID: c, inCollectionID: cid)

        let order = try XCTUnwrap(store.collections.first { $0.id == cid }?.cards).map(\.title)
        XCTAssertEqual(order, ["B", "C", "A"])
        // Order indices are re-normalised to match the new positions.
        let reindexed = try XCTUnwrap(store.collections.first { $0.id == cid }?.cards)
        XCTAssertEqual(reindexed.map(\.order), [0, 1, 2])
    }

    // MARK: - Promotion to default (admin, Req 13)

    /// Promoting a locally-owned collection strips the `user_` prefix so it becomes
    /// a shareable default; its cards are preserved.
    @MainActor
    func testPromoteCollectionToDefaultStripsUserPrefix() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.addCollection(title: "Space", color: "purple")
        let collection = try XCTUnwrap(store.collections.first { $0.title == "Space" })
        XCTAssertTrue(collection.id.hasPrefix("user_"))
        store.addCard(title: "Rocket", speech: "Rocket", color: "purple", to: collection.id)
        let promotedInput = try XCTUnwrap(store.collections.first { $0.id == collection.id })

        store.promoteCollectionToDefault(promotedInput)

        let expectedID = String(collection.id.dropFirst("user_".count))
        let promoted = try XCTUnwrap(store.collections.first { $0.title == "Space" })
        XCTAssertEqual(promoted.id, expectedID)
        XCTAssertFalse(promoted.id.hasPrefix("user_"))
        XCTAssertEqual(promoted.cards.map(\.title), ["Rocket"])
    }

    // MARK: - Image URL resolution

    @MainActor
    func testImageURLForCardUsesContentImageRef() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        let card = CommunicationCard(id: "c1", title: "Cat", speech: "Cat", imageRef: "abc-123", color: "green")
        let url = store.imageURL(for: card)
        XCTAssertEqual(url?.absoluteString, "\(CardsContentClient.baseURL)/content/images/abc-123")
    }

    @MainActor
    func testImageURLForCardWithoutImageRefIsNil() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        let card = CommunicationCard(id: "c1", title: "Cat", speech: "Cat", color: "green")
        XCTAssertNil(store.imageURL(for: card))
    }

    // MARK: - Media matching (offline-safe pure logic, Req 2)

    /// Decodes the media list from the documented API contract and confirms the
    /// derived `name` strips the file extension.
    func testMediaItemDecodesContractAndDerivesName() throws {
        let json = Data("""
        {"data":[
          {"id":"1","file_name":"cat.png","title":"Cat","folder":"animals","tags":["cat","pet"],"original_url":"https://data.tikocdn.org/uploads/cards/cat.png"}
        ]}
        """.utf8)
        let items = try JSONDecoder().decode(TikoMediaListResponse.self, from: json).data
        XCTAssertEqual(items.count, 1)
        XCTAssertEqual(items.first?.name, "cat")
        XCTAssertEqual(items.first?.fileName, "cat.png")
        XCTAssertEqual(items.first?.tags, ["cat", "pet"])
    }

    /// A card whose title matches a media item's name gets that item's resized CDN
    /// image; the first item also becomes the collection thumbnail.
    func testMediaMatcherMatchesByTitleAndSetsThumbnail() throws {
        let json = Data("""
        {"data":[
          {"id":"1","file_name":"cat.png","title":"Cat","folder":"animals","tags":["cat"],"original_url":"https://data.tikocdn.org/uploads/cards/cat.png"},
          {"id":"2","file_name":"dog.png","title":"Dog","folder":"animals","tags":["dog"],"original_url":"https://data.tikocdn.org/uploads/cards/dog.png"}
        ]}
        """.utf8)
        let items = try JSONDecoder().decode(TikoMediaListResponse.self, from: json).data
        let collection = CardCollection(id: "c", title: "Animals", color: "green", order: 0, cards: [
            CommunicationCard(id: "cat", title: "Cat", speech: "Cat", color: "green"),
            CommunicationCard(id: "dog", title: "Dog", speech: "Dog", color: "green"),
        ])

        let result = CardsMediaMatcher.match(collection: collection, mediaItems: items)

        let catSource = try XCTUnwrap(URL(string: "https://data.tikocdn.org/uploads/cards/cat.png"))
        XCTAssertEqual(result.cardImages["cat"], CardsMediaMatcher.resizedCDNURL(catSource))
        XCTAssertEqual(result.thumbnailURL, CardsMediaMatcher.resizedCDNURL(catSource))
        XCTAssertNotNil(result.cardImages["dog"])
    }

    /// When a card already carries an explicit `imageRef`, that content image wins
    /// over any media-library match.
    func testMediaMatcherPrefersExplicitImageRef() throws {
        let json = Data("""
        {"data":[
          {"id":"1","file_name":"cat.png","title":"Cat","folder":"animals","tags":["cat"],"original_url":"https://data.tikocdn.org/uploads/cards/cat.png"}
        ]}
        """.utf8)
        let items = try JSONDecoder().decode(TikoMediaListResponse.self, from: json).data
        let collection = CardCollection(id: "c", title: "Animals", color: "green", order: 0, cards: [
            CommunicationCard(id: "cat", title: "Cat", speech: "Cat", imageRef: "custom-ref", color: "green"),
        ])

        let result = CardsMediaMatcher.match(collection: collection, mediaItems: items)

        XCTAssertEqual(
            result.cardImages["cat"]?.absoluteString,
            "\(CardsContentClient.baseURL)/content/images/custom-ref"
        )
    }

    /// A card with no name match still resolves an image via a shared tag word.
    func testMediaMatcherFallsBackToTagWordMatch() throws {
        let json = Data("""
        {"data":[
          {"id":"1","file_name":"young-dog.png","title":"Young Dog","folder":"animals","tags":["puppy","dog"],"original_url":"https://data.tikocdn.org/uploads/cards/young-dog.png"}
        ]}
        """.utf8)
        let items = try JSONDecoder().decode(TikoMediaListResponse.self, from: json).data
        let collection = CardCollection(id: "c", title: "Animals", color: "green", order: 0, cards: [
            CommunicationCard(id: "puppy", title: "Puppy", speech: "Puppy", color: "green"),
        ])

        let result = CardsMediaMatcher.match(collection: collection, mediaItems: items)

        let source = try XCTUnwrap(URL(string: "https://data.tikocdn.org/uploads/cards/young-dog.png"))
        XCTAssertEqual(result.cardImages["puppy"], CardsMediaMatcher.resizedCDNURL(source))
    }
}
