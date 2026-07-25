import XCTest
@testable import TikoSum

final class SumGeneratorTests: XCTestCase {
    func testEveryPresetDealsTenValidSumsForEveryOperator() {
        for preset in SumCatalog.presets {
            for op in SumOperator.allCases {
                let round = SumGenerator.round(maxNumber: preset.maxNumber, operators: [op], seed: 42)
                XCTAssertEqual(round.count, 10, "\(preset.id) \(op) should deal ten")
                for formula in round {
                    XCTAssertEqual(formula.op, op)
                    guard let result = formula.result else {
                        return XCTFail("\(formula.a) \(op.symbol) \(formula.b) has no result")
                    }
                    XCTAssertLessThanOrEqual(result, preset.maxNumber, "result outside the preset")
                    XCTAssertLessThanOrEqual(formula.a, preset.maxNumber, "operand outside the preset")
                    XCTAssertLessThanOrEqual(formula.b, preset.maxNumber, "operand outside the preset")
                }
            }
        }
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
