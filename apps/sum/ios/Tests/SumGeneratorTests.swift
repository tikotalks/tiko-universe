import XCTest
@testable import TikoSum

final class SumGeneratorTests: XCTestCase {
    func testEveryPresetDealsTenValidSumsForEveryOperator() {
        for preset in SumCatalog.presets {
            for op in SumOperator.allCases {
                let round = SumGenerator.round(kind: preset.kind, operators: [op], seed: 42)
                XCTAssertEqual(round.count, 10, "\(preset.id) \(op.symbol) should deal ten")
                for formula in round {
                    XCTAssertEqual(formula.op, op)
                    guard let result = formula.result else {
                        return XCTFail("\(formula.a) \(op.symbol) \(formula.b) has no result")
                    }
                    XCTAssertGreaterThan(result, 0, "\(preset.id) \(op.symbol): nothing answers to zero")
                    XCTAssertLessThanOrEqual(result, 100, "\(preset.id) \(op.symbol): past the 0-100 cap")
                }
            }
        }
    }

    /// `max` bounds the answer for + and −, because "sums to ten" is about the
    /// answer. It bounds the factors for × and ÷, because "tables to five" is
    /// about the numbers you multiply — 5 × 5 = 25 belongs in the 1-5 mode.
    func testRangeBoundsTheAnswerForPlusAndTheFactorsForTimes() {
        let sums = SumGenerator.round(kind: .range(min: 1, max: 10), operators: [.plus], count: 60, seed: 5)
        for formula in sums {
            XCTAssertLessThanOrEqual(formula.result ?? 0, 10, "the answer is what 1-10 bounds for +")
        }

        let products = SumGenerator.round(kind: .range(min: 1, max: 5), operators: [.times], count: 60, seed: 5)
        XCTAssertFalse(products.isEmpty, "1-5 × must not be an empty mode")
        for formula in products {
            XCTAssertLessThanOrEqual(formula.a, 5, "the factors are what 1-5 bounds for ×")
            XCTAssertLessThanOrEqual(formula.b, 5, "the factors are what 1-5 bounds for ×")
        }
        XCTAssertTrue(products.contains { (formula: Formula) in (formula.result ?? 0) > 5 },
                      "the 5 times table has to reach past five")
    }

    func testABandKeepsItsAnswersAboveTheFloor() {
        for op in [SumOperator.plus, .minus] {
            let round = SumGenerator.round(kind: .range(min: 10, max: 20), operators: [op], count: 60, seed: 8)
            for formula in round {
                let result = formula.result ?? 0
                XCTAssertGreaterThanOrEqual(result, 10, "\(op.symbol): below the band floor")
                XCTAssertLessThanOrEqual(result, 20, "\(op.symbol): above the band ceiling")
            }
        }
    }

    /// 50-100 ÷ is exactly one sum inside the cap (100 ÷ 2). Dealing that ten
    /// times would be worse than quietly opening the floor.
    func testAnImpossiblyNarrowBandOpensUpRatherThanRepeatItself() {
        let round = SumGenerator.round(kind: .range(min: 50, max: 100), operators: [.dividedBy], seed: 4)
        XCTAssertEqual(round.count, 10)
        XCTAssertGreaterThan(Set(round).count, 1, "a round of one sum ten times over")
    }

    func testAFamilyPinsOneOperandToItsNumber() {
        for op in SumOperator.allCases {
            let round = SumGenerator.round(kind: .family(n: 5), operators: [op], count: 40, seed: 6)
            XCTAssertEqual(round.count, 40, "\(op.symbol): the 5s should always fill a round")
            for formula in round {
                XCTAssertEqual(formula.b, 5, "\(op.symbol): the 5s must always involve a five")
            }
        }
    }

    /// With ×, a family is the times table — and a table starts at 1 × n, which
    /// a free range would rightly throw out as trivial.
    func testTheTimesTableIncludesItsFirstRung() {
        let pool = SumGenerator.pool(kind: .family(n: 5), operators: [.times])
        XCTAssertTrue(pool.contains(Formula(a: 1, op: .times, b: 5)), "1 × 5 opens the table")
        XCTAssertTrue(pool.contains(Formula(a: 10, op: .times, b: 5)), "10 × 5 closes it")
    }

    func testMixedRoundUsesEveryOperatorItWasGiven() {
        let ops = SumOperator.allCases
        let round = SumGenerator.round(maxNumber: 100, operators: ops, count: 200, seed: 7)
        XCTAssertEqual(Set(round.map(\.op)), Set(ops))
    }

    func testNothingTrivialIsEverDealt() {
        let round = SumGenerator.round(maxNumber: 100, operators: SumOperator.allCases, count: 400, seed: 3)
        for formula in round {
            XCTAssertGreaterThan(formula.a, 0, "no zero operands")
            XCTAssertGreaterThan(formula.b, 0, "no zero operands")
            if formula.op == .times {
                XCTAssertGreaterThan(formula.a, 1)
                XCTAssertGreaterThan(formula.b, 1)
            }
            if formula.op == .dividedBy {
                XCTAssertGreaterThan(formula.b, 1, "÷1 is not division practice")
                XCTAssertGreaterThan(formula.result ?? 0, 1)
            }
        }
    }

    func testARoundNeverRepeatsItselfBackToBack() {
        // ÷ within 10 is the smallest pool there is — it still has to fill ten.
        let round = SumGenerator.round(maxNumber: 10, operators: [.dividedBy], seed: 11)
        XCTAssertEqual(round.count, 10)
        for (previous, next) in zip(round, round.dropFirst()) {
            XCTAssertNotEqual(previous, next, "the same sum twice in a row")
        }
    }

    func testTheSameSeedDealsTheSameRound() {
        let a = SumGenerator.round(maxNumber: 20, operators: [.plus, .minus], seed: 99)
        let b = SumGenerator.round(maxNumber: 20, operators: [.plus, .minus], seed: 99)
        XCTAssertEqual(a, b)
    }

    func testSpecMakesATenSumGame() {
        let spec = SumRunSpec(preset: SumCatalog.presets[0], operators: [.plus])
        let game = spec.makeGame()
        XCTAssertEqual(game.formulas.count, SumGenerator.roundLength)
        XCTAssertEqual(game.emoji, SumCatalog.presets[0].emoji)
    }
}
