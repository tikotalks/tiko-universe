import Foundation
import TikoKit

/// Deals the ten random sums a preset round is made of. Difficulty is the only
/// input that matters — the operators come from what the child picked in the
/// game, never from the preset itself.
enum SumGenerator {
    /// Every preset round is ten sums long.
    static let roundLength = 10

    static func round(
        maxNumber: Int,
        operators: [SumOperator],
        count: Int = roundLength,
        seed: UInt64? = nil
    ) -> [Formula] {
        let pool = pool(maxNumber: maxNumber, operators: operators)
        guard !pool.isEmpty, count > 0 else { return [] }

        var generator = TikoSeededGenerator(seed: seed ?? UInt64.random(in: 1...UInt64.max))
        var round: [Formula] = []
        // Draw without replacement so a round never repeats itself, reshuffling
        // whenever a small pool (÷ within 10) runs dry before ten.
        while round.count < count {
            var deal = pool.shuffled(using: &generator)
            if deal.count > 1, deal.first == round.last {
                deal.swapAt(0, 1)
            }
            round.append(contentsOf: deal.prefix(count - round.count))
        }
        return round
    }

    /// Every sum worth practising at this difficulty: both operands and the
    /// result inside the range, and nothing trivial — no zeroes, no ×1, no ÷1.
    static func pool(maxNumber: Int, operators: [SumOperator]) -> [Formula] {
        let ops = operators.isEmpty ? SumOperator.allCases : operators
        let upper = max(1, min(100, maxNumber))
        var pool: [Formula] = []
        for op in ops {
            for a in 1...upper {
                for b in 1...upper {
                    let formula = Formula(a: a, op: op, b: b)
                    guard let result = formula.result, result <= upper else { continue }
                    switch op {
                    case .plus, .minus:
                        break
                    case .times:
                        guard a > 1, b > 1 else { continue }
                    case .dividedBy:
                        guard b > 1, result > 1 else { continue }
                    }
                    pool.append(formula)
                }
            }
        }
        return pool
    }
}
