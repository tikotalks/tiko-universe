import XCTest
@testable import TikoSum

final class DistractorGeneratorTests: XCTestCase {
    func testAlwaysThreeUniqueChoicesWithOneCorrect() {
        for (a, op, b) in [(3, SumOperator.plus, 5), (10, .minus, 4), (6, .times, 5), (20, .dividedBy, 10), (1, .plus, 1), (0, .plus, 0)] {
            let formula = Formula(a: a, op: op, b: b)
            let choices = DistractorGenerator.choices(for: formula)
            XCTAssertEqual(choices.count, 3, "\(a) \(op) \(b)")
            XCTAssertEqual(Set(choices.map(\.value)).count, 3, "unique values")
            XCTAssertEqual(choices.filter(\.isCorrect).count, 1, "exactly one correct")
            XCTAssertEqual(choices.first(where: \.isCorrect)?.value, formula.result)
        }
    }

    func testDistractorsStayInBounds() {
        for a in 0...20 {
            let formula = Formula(a: a, op: .plus, b: 1)
            for choice in DistractorGenerator.choices(for: formula, maxNumber: 100) {
                XCTAssertGreaterThanOrEqual(choice.value, 0)
                XCTAssertLessThanOrEqual(choice.value, 100)
            }
        }
    }

    func testDeterministicUnderSeed() {
        let formula = Formula(a: 7, op: .plus, b: 8)
        let first = DistractorGenerator.choices(for: formula, seed: 42)
        let second = DistractorGenerator.choices(for: formula, seed: 42)
        XCTAssertEqual(first.map(\.value), second.map(\.value))
    }

    func testInvalidFormulaYieldsNoChoices() {
        XCTAssertTrue(DistractorGenerator.choices(for: Formula(a: 7, op: .dividedBy, b: 2)).isEmpty)
        XCTAssertTrue(DistractorGenerator.choices(for: Formula(a: 3, op: .minus, b: 9)).isEmpty)
        XCTAssertTrue(DistractorGenerator.choices(for: Formula(a: 60, op: .plus, b: 60)).isEmpty)
    }

    func testDigitSwap() {
        XCTAssertEqual(DistractorGenerator.digitSwap(34), 43)
        XCTAssertEqual(DistractorGenerator.digitSwap(7), 7)
        XCTAssertEqual(DistractorGenerator.digitSwap(20), 2)
    }

    func testExactDivisionGuarantee() {
        XCTAssertNil(Formula(a: 7, op: .dividedBy, b: 2).result)
        XCTAssertNil(Formula(a: 5, op: .dividedBy, b: 0).result)
        XCTAssertEqual(Formula(a: 20, op: .dividedBy, b: 10).result, 2)
    }
}
