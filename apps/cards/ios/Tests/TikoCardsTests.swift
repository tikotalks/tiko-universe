import XCTest
import TikoKit
@testable import TikoCards

final class TikoCardsTests: XCTestCase {
    // MARK: - The bundled default vocabulary (Req 5, 6)

    /// The root grid, most needed first: what a child has to say, who and what
    /// is around them every day, then the wider world, then the school subjects.
    func testDefaultVocabularyRootCategoriesInOrder() {
        let roots = defaultCardCollections.filter { $0.parentID == nil }.sorted { $0.order < $1.order }
        XCTAssertEqual(roots.map(\.id), [
            "__default_quick",
            "__default_feelings",
            "__default_people",
            "__default_food",
            "__default_body",
            "__default_home",
            "__default_clothes",
            "__default_toys",
            "__default_animals",
            "__default_places",
            "__default_school",
            "__default_health",
            "__default_transport",
            "__default_nature",
            "__default_sensory",
            "__default_music",
            "__default_sports",
            "__default_baby",
            "__default_colours",
            "__default_numbers",
            "__default_letters",
            "__default_shapes",
            "__default_celebrations",
            "__default_stories",
            "__default_space",
        ])
    }

    func testDefaultVocabularyHasSubCategoriesUnderExistingParents() {
        let ids = Set(defaultCardCollections.map(\.id))
        let subs = defaultCardCollections.filter { $0.parentID != nil }
        XCTAssertEqual(subs.count, 28)
        XCTAssertTrue(subs.allSatisfy { ids.contains($0.parentID ?? "") }, "every sub-category hangs under a category that exists")
        XCTAssertEqual(
            Set(subs.filter { $0.parentID == "__default_animals" }.map(\.id)),
            ["__default_pets", "__default_farm", "__default_wild", "__default_sea", "__default_birds", "__default_bugs"]
        )
    }

    func testDefaultCollectionsContainSpeakableCards() {
        let cards = defaultCardCollections.flatMap(\.cards)
        XCTAssertEqual(defaultCardCollections.count, 53)
        XCTAssertGreaterThan(cards.count, 1200)
        XCTAssertTrue(cards.allSatisfy { !$0.speech.isEmpty })
        XCTAssertEqual(Set(cards.map(\.id)).count, cards.count, "card ids are unique")
        // A category is never an empty screen: it has cards, or categories in it.
        for collection in defaultCardCollections where collection.cards.isEmpty {
            XCTAssertTrue(defaultCardCollections.contains { $0.parentID == collection.id }, "\(collection.id) is empty")
        }
    }

    /// No default card looks for its picture at run time: it is pinned to one
    /// the vocabulary can address directly, or it is a colour card, whose tile
    /// colour is the picture.
    func testEveryDefaultCardIsPinnedToAPictureOrIsAColour() {
        for collection in defaultCardCollections {
            XCTAssertTrue(collection.mediaCategories.isEmpty, "\(collection.id) still asks for a media search")
            for card in collection.cards {
                guard let imageRef = card.imageRef else {
                    XCTAssertEqual(collection.id, "__default_colours", "\(card.id) has no picture")
                    XCTAssertEqual(card.color, card.title.lowercased())
                    continue
                }
                XCTAssertNotNil(CardsDefaults.pictureURL(forImageRef: imageRef), "\(card.id) is pinned to a picture the bundle cannot address")
            }
        }
    }

    func testEveryDefaultCollectionHasATilePicture() {
        // Colours included: its cards are plain colour tiles, so the collection
        // names a picture of its own.
        for collection in defaultCardCollections {
            let imageRef = try? XCTUnwrap(collection.imageRef, "\(collection.id) has no tile picture")
            if let imageRef { XCTAssertNotNil(CardsDefaults.pictureURL(forImageRef: imageRef)) }
        }
    }

    /// Food is ten shelves, a meal each among them, not one long list.
    func testFoodIsSplitByMealAndKind() {
        let food = defaultCardCollections.filter { $0.parentID == "__default_food" }.sorted { $0.order < $1.order }
        XCTAssertEqual(food.map(\.id), [
            "__default_breakfast", "__default_lunch", "__default_dinner", "__default_bakery", "__default_fruit",
            "__default_vegetables", "__default_snacks", "__default_sweets", "__default_sauces", "__default_drinks",
        ])
        XCTAssertTrue(food.allSatisfy { $0.cards.count >= 13 }, "every food shelf is well stocked")
    }

    func testFamilyIsAGroupInsidePeople() throws {
        let family = try XCTUnwrap(defaultCardCollections.first { $0.id == "__default_family" })
        XCTAssertEqual(family.parentID, "__default_people")
        XCTAssertTrue(family.cards.contains { $0.title == "Mom" })
        XCTAssertTrue(family.cards.contains { $0.title == "Grandpa" })
        let people = try XCTUnwrap(defaultCardCollections.first { $0.id == "__default_people" })
        XCTAssertFalse(people.cards.contains { $0.title == "Mom" }, "family members live in Family, not twice")
    }

    func testThereIsASensoryCategory() throws {
        let sensory = try XCTUnwrap(defaultCardCollections.first { $0.id == "__default_sensory" })
        XCTAssertNil(sensory.parentID)
        XCTAssertGreaterThan(sensory.cards.count, 20)
        XCTAssertTrue(sensory.cards.contains { $0.title == "Fidget spinner" })
    }

    func testEveryDefaultCardHasAFitzgeraldCategory() {
        for card in defaultCardCollections.flatMap(\.cards) {
            XCTAssertNotNil(TikoFitzgerald(rawValue: card.fitzgeraldCategory ?? ""), "\(card.id): \(card.fitzgeraldCategory ?? "nil")")
        }
    }

    /// A quick word says the whole need, not just its label.
    func testQuickWordsSpeakASentence() throws {
        let quick = try XCTUnwrap(defaultCardCollections.first { $0.id == "__default_quick" })
        let help = try XCTUnwrap(quick.cards.first { $0.id == "__default_quick_help" })
        XCTAssertEqual(help.title, "Help")
        XCTAssertEqual(help.speech, "I need help")
    }

    func testDefaultVocabularyIsTranslatedIntoDutch() throws {
        let dutch = CardsDefaults.collections(languageCode: "nl")
        XCTAssertEqual(dutch.map(\.id), defaultCardCollections.map(\.id), "a translation changes words, never structure")
        let pets = try XCTUnwrap(dutch.first { $0.id == "__default_pets" })
        XCTAssertEqual(pets.title, "Huisdieren")
        let dog = try XCTUnwrap(pets.cards.first { $0.id == "__default_pets_dog" })
        XCTAssertEqual(dog.title, "Hond")
        XCTAssertEqual(dog.speech, "Hond")
        let help = try XCTUnwrap(dutch.first { $0.id == "__default_quick" }?.cards.first { $0.id == "__default_quick_help" })
        XCTAssertEqual(help.speech, "Ik heb hulp nodig")
        // The same English word, two meanings, two Dutch words.
        XCTAssertEqual(dutch.first { $0.id == "__default_colours" }?.cards.first { $0.id == "__default_colours_orange" }?.title, "Oranje")
        // Nothing is left half-translated: every Dutch word differs from, or is
        // deliberately the same as, the English one, and none is missing.
        let dutchSensory = try XCTUnwrap(dutch.first { $0.id == "__default_sensory" })
        XCTAssertEqual(dutchSensory.title, "Prikkels")
        XCTAssertEqual(dutch.first { $0.id == "__default_fruit" }?.cards.first { $0.id == "__default_fruit_orange" }?.title, "Sinaasappel")
    }

    func testALanguageWithoutATranslationStaysEnglish() {
        XCTAssertEqual(CardsDefaults.collections(languageCode: "hy"), defaultCardCollections)
        XCTAssertEqual(CardsDefaults.collections(languageCode: "nl-BE").first?.title, CardsDefaults.collections(languageCode: "nl").first?.title)
    }

    func testDefaultCollectionsRoundTripJSON() throws {
        let data = try JSONEncoder().encode(defaultCardCollections)
        let decoded = try JSONDecoder().decode([CardCollection].self, from: data)
        XCTAssertEqual(decoded, defaultCardCollections)
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

    @MainActor
    func testLoadOfflineDefaultsFollowsTheLanguage() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        store.loadOfflineDefaults(languageCode: "nl")

        XCTAssertTrue(store.collections.contains { $0.id == "__default_animals" && $0.title == "Dieren" })
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

    /// A picture the vocabulary pins is loaded straight from the media CDN,
    /// resized for a tile, with no content API in between.
    @MainActor
    func testImageURLForADefaultCardIsItsPinnedPicture() throws {
        let (store, suiteName) = try makeIsolatedStore()
        defer { UserDefaults().removePersistentDomain(forName: suiteName) }

        let dog = try XCTUnwrap(defaultCardCollections.first { $0.id == "__default_pets" }?.cards.first { $0.id == "__default_pets_dog" })
        let imageRef = try XCTUnwrap(dog.imageRef)
        let pinned = try XCTUnwrap(CardsDefaults.pictureURL(forImageRef: imageRef))
        XCTAssertEqual(store.imageURL(for: dog), CardsMediaMatcher.resizedCDNURL(pinned))
        XCTAssertFalse(store.imageURL(for: dog)?.absoluteString.contains("content.tikoapi.org") ?? true)
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
    /// Tag-only matching used to be the fallback, and it is what put wrong
    /// pictures on cards: the library tags loosely, so "water" lands on a toilet
    /// and "juice" on an apple. A card with no confident title match now keeps
    /// its text and colour instead.
    func testMediaMatcherDoesNotMatchOnTagsAlone() throws {
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

        XCTAssertNil(result.cardImages["puppy"])
    }

    // MARK: - Media matching safety (regression)
    //
    // The library is capped and sorted by title, so a category page for
    // "animals" only ever returns Aardvark…Atlantic Puffin and a card called
    // "Cat" never saw a candidate. Every default card rendered as a flat colour
    // block. These pin the matcher that replaced it.

    private func items(_ titles: [String]) throws -> [TikoMediaItem] {
        let entries = titles.enumerated().map { index, title in
            let slug = title.lowercased().replacingOccurrences(of: " ", with: "-")
            return """
            {"id":"\(index)","file_name":"\(slug).png","title":"\(title)","folder":"f","tags":[],            "original_url":"https://data.tikocdn.org/uploads/\(slug).png"}
            """
        }
        return try JSONDecoder()
            .decode(TikoMediaListResponse.self, from: Data("{\"data\":[\(entries.joined(separator: ","))]}".utf8))
            .data
    }

    func testBestMatchPrefersTheExactWord() throws {
        let match = CardsMediaMatcher.bestMatch(for: "Cat", in: try items(["Wildcat", "Cat", "Cat Food"]))
        XCTAssertEqual(match?.title, "Cat")
    }

    func testBestMatchIgnoresPluralDifference() throws {
        XCTAssertEqual(CardsMediaMatcher.bestMatch(for: "Pretzels", in: try items(["Pretzel"]))?.title, "Pretzel")
        XCTAssertEqual(CardsMediaMatcher.bestMatch(for: "Eyes", in: try items(["Eye"]))?.title, "Eye")
    }

    /// A leading modifier is fine while the card word stays the head noun:
    /// a Golden Apple is still an apple.
    func testBestMatchAcceptsAModifierBeforeTheCardWord() throws {
        XCTAssertEqual(CardsMediaMatcher.bestMatch(for: "Apple", in: try items(["Golden Apple"]))?.title, "Golden Apple")
        XCTAssertEqual(CardsMediaMatcher.bestMatch(for: "Bird", in: try items(["Indigo Bird"]))?.title, "Indigo Bird")
    }

    /// The card word as a *modifier* names a different object. Rice Cooker is
    /// not rice, and on an AAC card the wrong picture is worse than none.
    func testBestMatchRejectsWhenTheCardWordIsNotTheHeadNoun() throws {
        XCTAssertNil(CardsMediaMatcher.bestMatch(for: "Rice", in: try items(["Rice Cooker"])))
        XCTAssertNil(CardsMediaMatcher.bestMatch(for: "Pizza", in: try items(["Pizza Cutter"])))
        XCTAssertNil(CardsMediaMatcher.bestMatch(for: "Soup", in: try items(["Soup Ladle"])))
    }

    /// Some modifiers change the referent even in head-noun position.
    func testBestMatchRejectsMeaningChangingModifiers() throws {
        XCTAssertNil(CardsMediaMatcher.bestMatch(for: "Pig", in: try items(["Guinea Pig"])))
        XCTAssertNil(CardsMediaMatcher.bestMatch(for: "Star", in: try items(["Ninja Star"])))
    }

    /// No confident candidate means no picture, not a nearest guess.
    func testBestMatchReturnsNilRatherThanAWrongPicture() throws {
        XCTAssertNil(CardsMediaMatcher.bestMatch(for: "Eat", in: try items(["Volleyball", "Fairy", "Basketball"])))
        XCTAssertNil(CardsMediaMatcher.bestMatch(for: "Red", in: try items(["Tennis Ball", "Little Red Riding Hood"])))
    }

    func testBestMatchSkipsItemsAlreadyUsedByAnotherCard() throws {
        let pool = try items(["Cat"])
        let used = Set([pool[0].originalURL])
        XCTAssertNil(CardsMediaMatcher.bestMatch(for: "Cat", in: pool, excluding: used))
    }
}
