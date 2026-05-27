import XCTest
@testable import TikoKit

final class TikoKitTests: XCTestCase {
    func testAppColorsHaveUniqueRawValues() {
        let rawValues = TikoAppColor.allCases.map(\.rawValue)

        XCTAssertEqual(Set(rawValues).count, rawValues.count)
        XCTAssertEqual(TikoAppColor.yesNo.palette.label, "Yes No")
    }

    func testAnswerChoiceKeepsProductContract() {
        let choice = TikoAnswerChoice(id: "yes", label: "Yes", symbol: "👍", tone: .primary)

        XCTAssertEqual(choice.id, "yes")
        XCTAssertEqual(choice.label, "Yes")
        XCTAssertEqual(choice.symbol, "👍")
        XCTAssertEqual(choice.tone, .primary)
    }
}
