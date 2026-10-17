import XCTest
import TikoKit
@testable import TikoCards

final class FitzgeraldCodingTests: XCTestCase {
    func testExistingCardDecodesWithoutClassification() throws {
        let data = Data(#"{"id":"one","title":"Water","speech":"Water","color":"blue","order":2}"#.utf8)
        let card = try JSONDecoder().decode(CommunicationCard.self, from: data)
        XCTAssertNil(card.fitzgeraldCategory)
        XCTAssertEqual(card.color, "blue")
        XCTAssertEqual(card.order, 2)
    }

    func testCategoryRoundTripDoesNotOverwriteCustomColor() throws {
        let card = CommunicationCard(id: "one", title: "Water", speech: "Water", color: "blue", order: 2, fitzgeraldCategory: "thing")
        let decoded = try JSONDecoder().decode(CommunicationCard.self, from: JSONEncoder().encode(card))
        XCTAssertEqual(decoded, card)
    }
}
