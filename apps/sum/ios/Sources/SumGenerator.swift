import Foundation
import TikoKit

/// Deals the ten random sums a preset round is made of. The mode says how big
/// the numbers get (or which number every sum is built around); the operators
/// come from what the child picked in the header, never from the mode itself.
enum SumGenerator {
    /// Every preset round is ten sums long.
    static let roundLength = 10

    /// Below this a round would deal the same handful of sums over and over, so
    /// the floor gets opened up until there is enough to draw a varied ten from.
    static let minimumPool = 12

    static func round(
        kind: SumPresetKind,
        operators: [SumOperator],
        count: Int = roundLength,
        seed: UInt64? = nil
    ) -> [Formula] {
        var kind = kind
        var pool = pool(kind: kind, operators: operators)
        // A band like 50-100 barely exists for ÷ inside the 0-100 cap. Rather
        // than deal 100÷2 ten times, drop the floor until the round can vary.
        while pool.count < minimumPool, case .range(let low, let high) = kind, low > 1 {
            kind = .range(min: max(1, low / 2), max: high)
            pool = self.pool(kind: kind, operators: operators)
        }
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

    /// Convenience for free play and tests: a plain 1…max range.
    static func round(
        maxNumber: Int,
        operators: [SumOperator],
        count: Int = roundLength,
        seed: UInt64? = nil
    ) -> [Formula] {
        round(kind: .range(min: 1, max: maxNumber), operators: operators, count: count, seed: seed)
    }

    /// Every sum worth practising in this mode, and nothing trivial — no
    /// zeroes, no ÷1, no ×1 outside a family (where "1 × 2" is the first rung
    /// of the table and belongs).
    static func pool(kind: SumPresetKind, operators: [SumOperator]) -> [Formula] {
        let ops = operators.isEmpty ? SumOperator.allCases : operators
        var pool: [Formula] = []
        for op in ops {
            switch kind {
            case .range(let low, let high):
                pool.append(contentsOf: rangePool(op: op, low: low, high: high))
            case .family(let n):
                pool.append(contentsOf: familyPool(op: op, n: n))
            }
        }
        return pool
    }

    /// `max` means different things to + and × and that is the point: "sums to
    /// ten" bounds the answer, "tables to five" bounds the factors. Bounding ×
    /// by its answer instead would leave 1-5 with nothing but 2 × 2.
    private static func rangePool(op: SumOperator, low: Int, high: Int) -> [Formula] {
        let upper = max(1, min(100, high))
        let floor = max(1, min(low, upper))
        var pool: [Formula] = []
        switch op {
        case .plus, .minus:
            for a in 1...upper {
                for b in 1...upper {
                    let formula = Formula(a: a, op: op, b: b)
                    guard let result = formula.result, (floor...upper).contains(result) else { continue }
                    pool.append(formula)
                }
            }
        case .times:
            guard upper >= 2 else { return [] }
            for a in 2...upper {
                for b in 2...upper {
                    let formula = Formula(a: a, op: op, b: b)
                    guard let result = formula.result, result >= floor else { continue }
                    pool.append(formula)
                }
            }
        case .dividedBy:
            // Divisor and quotient both inside the range; the dividend is
            // whatever that multiplies out to, capped by Formula at 100.
            guard upper >= 2 else { return [] }
            for b in 2...upper {
                for quotient in 2...upper {
                    let formula = Formula(a: b * quotient, op: op, b: b)
                    guard let result = formula.result, result >= floor else { continue }
                    pool.append(formula)
                }
            }
        }
        return pool
    }

    /// One operand pinned to `n`. The whole table, counting on and back by n,
    /// and sharing into n — all from the same mode.
    private static func familyPool(op: SumOperator, n: Int) -> [Formula] {
        guard n > 1 else { return [] }
        var pool: [Formula] = []
        switch op {
        case .plus, .minus, .times:
            // Tables start at 1 × n, so no a > 1 guard here — unlike a free
            // range, "1 × 5" is the first rung and worth practising. "5 − 5"
            // is dropped though: nothing in Sum ever answers to zero.
            for a in 1...100 {
                let formula = Formula(a: a, op: op, b: n)
                guard let result = formula.result, result > 0 else { continue }
                pool.append(formula)
            }
        case .dividedBy:
            for quotient in 1...100 {
                let formula = Formula(a: quotient * n, op: op, b: n)
                guard let result = formula.result, result > 0 else { continue }
                pool.append(formula)
            }
        }
        return pool
    }
}
