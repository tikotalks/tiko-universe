import XCTest
@testable import TikoCards

final class TikoCardsTests: XCTestCase {
    func testCardsAppSmoke() {
        XCTAssertEqual("Cards", "Cards")
    }

    func testDefaultCollectionsContainSpeakableCards() {
        XCTAssertFalse(defaultCardCollections.isEmpty)
        XCTAssertTrue(defaultCardCollections.allSatisfy { !$0.cards.isEmpty })
        XCTAssertTrue(defaultCardCollections.flatMap(\.cards).allSatisfy { !$0.speech.isEmpty })
    }

    func testDefaultCollectionsRoundTripJSON() throws {
        let data = try JSONEncoder().encode(defaultCardCollections)
        let decoded = try JSONDecoder().decode([CardCollection].self, from: data)
        XCTAssertEqual(decoded, defaultCardCollections)
    }
}
