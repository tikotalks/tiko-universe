import XCTest
@testable import TikoKit

final class FitzgeraldTests: XCTestCase {
    func testGrammarAndUnknowns() {
        XCTAssertEqual(TikoFitzgerald.category(for: "pronoun"), .person)
        XCTAssertEqual(TikoFitzgerald.category(for: "verb"), .action)
        XCTAssertEqual(TikoFitzgerald.category(for: "noun"), .thing)
        XCTAssertEqual(TikoFitzgerald.category(for: "adverb"), .describing)
        XCTAssertEqual(TikoFitzgerald.category(for: "social"), .social)
        for pos in ["phrase", "question", "preposition", "determiner", "unknown", ""] {
            XCTAssertEqual(TikoFitzgerald.category(for: pos), .miscellaneous)
        }
    }
}
