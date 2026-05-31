import XCTest
@testable import TikoKit

final class TikoKitTests: XCTestCase {
    func testAppColorsHaveUniqueRawValues() {
        let rawValues = TikoAppColor.allCases.map(\.rawValue)

        XCTAssertEqual(Set(rawValues).count, rawValues.count)
        XCTAssertEqual(TikoAppColor.yesNo.palette.label, "Yes No")
    }

    func testAnswerChoiceWithSystemName() {
        let choice = TikoAnswerChoice(id: "yes", label: "Yes", icon: .systemName("checkmark"), tone: .primary)

        XCTAssertEqual(choice.id, "yes")
        XCTAssertEqual(choice.label, "Yes")
        XCTAssertEqual(choice.icon, .systemName("checkmark"))
        XCTAssertEqual(choice.tone, .primary)
    }

    func testAnswerChoiceBackwardCompatSymbol() {
        let choice = TikoAnswerChoice(id: "no", label: "No", symbol: "xmark", tone: .secondary)

        XCTAssertEqual(choice.id, "no")
        XCTAssertEqual(choice.icon, .text("xmark"))
        XCTAssertEqual(choice.tone, .secondary)
    }

    func testIconEquality() {
        XCTAssertEqual(TikoAnswerChoice.Icon.systemName("checkmark"), .systemName("checkmark"))
        XCTAssertNotEqual(TikoAnswerChoice.Icon.systemName("checkmark"), .systemName("xmark"))
        XCTAssertEqual(TikoAnswerChoice.Icon.text("A"), .text("A"))
        XCTAssertNotEqual(TikoAnswerChoice.Icon.systemName("A"), .text("A"))
    }
}
