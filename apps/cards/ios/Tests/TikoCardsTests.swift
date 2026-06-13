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
}
