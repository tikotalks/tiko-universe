import Foundation
import TikoKit

/// Builds the three answer tiles: the correct result plus two *plausible*
/// distractors. Deterministic under a seed so tests can pin behaviour.
enum DistractorGenerator {
    static func choices(for formula: Formula, maxNumber: Int = 100, seed: UInt64? = nil) -> [AnswerChoice] {
        guard let correct = formula.result else { return [] }

        var candidates: [Int] = [
            correct + 1, correct - 1,
            correct + 2, correct - 2,
            correct + 10, correct - 10,
            formula.a, formula.b,
            digitSwap(correct),
        ]
        // Widen if the plausible pool is too small (e.g. tiny results).
        candidates.append(contentsOf: [correct + 3, correct - 3, correct + 4, correct - 4])

        var seen = Set<Int>([correct])
        let filtered = candidates.filter { value in
            guard value >= 0, value <= maxNumber, !seen.contains(value) else { return false }
            seen.insert(value)
            return true
        }

        var generator = TikoSeededGenerator(seed: seed ?? UInt64(bitPattern: Int64(formula.hashValue)))
        let distractors = Array(filtered.shuffled(using: &generator).prefix(2))

        var choices = distractors.map { AnswerChoice(value: $0, isCorrect: false) }
        choices.append(AnswerChoice(value: correct, isCorrect: true))
        return choices.shuffled(using: &generator)
    }

    /// 34 → 43; single digits return themselves (filtered as duplicates).
    static func digitSwap(_ value: Int) -> Int {
        guard value >= 10 else { return value }
        let swapped = Int(String(String(value).reversed())) ?? value
        return swapped
    }
}
