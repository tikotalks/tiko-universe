import XCTest
@testable import TikoCards

final class TikoCardsTests: XCTestCase {
    func testDefaultCollectionsMatchWebCardsCategories() {
        XCTAssertEqual(defaultCardCollections.map(\.id), [
            "__default_animals",
            "__default_colors",
            "__default_food",
            "__default_body",
            "__default_shapes",
            "__default_emotions",
            "__default_transport",
            "__default_numbers",
            "__default_letters",
        ])
    }

    func testDefaultCollectionsContainSpeakableCards() {
        XCTAssertEqual(defaultCardCollections.count, 9)
        XCTAssertGreaterThan(defaultCardCollections.flatMap(\.cards).count, 200)
        XCTAssertTrue(defaultCardCollections.allSatisfy { !$0.cards.isEmpty })
        XCTAssertTrue(defaultCardCollections.flatMap(\.cards).allSatisfy { !$0.speech.isEmpty })
    }

    func testDefaultCollectionsRoundTripJSON() throws {
        let data = try JSONEncoder().encode(defaultCardCollections)
        let decoded = try JSONDecoder().decode([CardCollection].self, from: data)
        XCTAssertEqual(decoded, defaultCardCollections)
    }

    func testMediaCategoryMapMatchesWebCardsContract() {
        XCTAssertEqual(defaultCollectionCategoryMap["__default_animals"], ["animals"])
        XCTAssertEqual(defaultCollectionCategoryMap["__default_food"], ["food", "food-drinks"])
        XCTAssertEqual(defaultCollectionCategoryMap["__default_emotions"], ["emotions", "feelings"])
        XCTAssertEqual(defaultCollectionCategoryMap["__default_letters"], ["letters", "alphabet"])
    }

    func testCDNURLUsesImageResizingForTikoUploads() throws {
        let source = try XCTUnwrap(URL(string: "https://data.tikocdn.org/uploads/cards/dog.png"))
        let resized = CardsMediaMatcher.resizedCDNURL(source)
        XCTAssertEqual(resized.absoluteString, "https://data.tikocdn.org/cdn-cgi/image/width=300,quality=80,f=auto/uploads/cards/dog.png")
    }
}
