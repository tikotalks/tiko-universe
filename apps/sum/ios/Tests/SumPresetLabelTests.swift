import XCTest
@testable import TikoSum

/// The tile titles and the remembered header choice — the two things that tell
/// the child what they are about to play.
final class SumPresetLabelTests: XCTestCase {
    private let familyFormat = "{n}s"

    func testARangeSpellsOutBothEnds() {
        let preset = SumPreset(id: "x", kind: .range(min: 1, max: 10), emoji: "🍎", mediaMatchKey: "apple")
        XCTAssertEqual(preset.label(for: .single(.plus), familyFormat: familyFormat), "1-10",
                       "a bare 10 could mean ten sums or up to ten")
    }

    func testABandSpellsOutItsFloor() {
        let preset = SumPreset(id: "x", kind: .range(min: 20, max: 50), emoji: "🐬", mediaMatchKey: "dolphin")
        XCTAssertEqual(preset.label(for: .single(.times), familyFormat: familyFormat), "20-50")
    }

    /// The same tile is the 2 times table under ×, and counting on by 2 under +.
    func testAFamilyBorrowsWhicheverOperatorIsSelected() {
        let preset = SumPreset(id: "x", kind: .family(n: 2), emoji: "🐞", mediaMatchKey: "ladybug")
        XCTAssertEqual(preset.label(for: .single(.times), familyFormat: familyFormat), "×2")
        XCTAssertEqual(preset.label(for: .single(.plus), familyFormat: familyFormat), "+2")
        XCTAssertEqual(preset.label(for: .single(.minus), familyFormat: familyFormat), "−2")
        XCTAssertEqual(preset.label(for: .single(.dividedBy), familyFormat: familyFormat), "÷2")
        XCTAssertEqual(preset.label(for: .mixed, familyFormat: familyFormat), "2s")
    }

    func testTheHeaderChoiceSurvivesARoundTripThroughStorage() {
        for choice in [SumOperatorChoice.single(.plus), .single(.dividedBy), .mixed] {
            XCTAssertEqual(SumOperatorChoice(storageValue: choice.storageValue), choice)
        }
    }

    func testAnUnknownStoredValueFallsBackToMixed() {
        XCTAssertEqual(SumOperatorChoice(storageValue: "nonsense"), .mixed)
    }

    /// A remembered × cannot outlive the parent switching × off.
    func testAChoiceResolvesAgainstWhatTheParentAllows() {
        let allowed: [SumOperator] = [.plus, .minus]
        XCTAssertEqual(SumOperatorChoice.single(.times).operators(allowed: allowed), [.plus])
        XCTAssertEqual(SumOperatorChoice.single(.minus).operators(allowed: allowed), [.minus])
        XCTAssertEqual(SumOperatorChoice.mixed.operators(allowed: allowed), [.plus, .minus])
    }
}
