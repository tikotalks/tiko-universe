import Foundation
import TikoKit

// MARK: - Operators

enum SumOperator: String, Codable, CaseIterable, Hashable {
    case plus
    case minus
    case times
    case dividedBy

    var symbol: String {
        switch self {
        case .plus: return "+"
        case .minus: return "−"
        case .times: return "×"
        case .dividedBy: return "÷"
        }
    }

    var systemImage: String {
        switch self {
        case .plus: return "plus"
        case .minus: return "minus"
        case .times: return "multiply"
        case .dividedBy: return "divide"
        }
    }
}

// MARK: - Formula

/// One complete exercise: `a op b`. The result is derived and guaranteed to
/// stay in 0…100 with exact division — invalid combinations have no result.
struct Formula: Codable, Hashable {
    var a: Int
    var op: SumOperator
    var b: Int

    var result: Int? {
        let value: Int
        switch op {
        case .plus: value = a + b
        case .minus: value = a - b
        case .times: value = a * b
        case .dividedBy:
            guard b != 0, a % b == 0 else { return nil }
            value = a / b
        }
        guard (0...100).contains(value) else { return nil }
        return value
    }

    var isValid: Bool { result != nil }
}

/// How the child answers: pick a tile, type the number, or say it.
/// Parent-selectable; voice is the only mode that ever touches the mic.
enum SumAnswerMode: String, Codable, CaseIterable {
    case choice
    case type
    case voice

    var systemImage: String {
        switch self {
        case .choice: return "square.grid.3x1.below.line.grid.1x2"
        case .type: return "keyboard"
        case .voice: return "mic"
        }
    }
}

// MARK: - Answer choice

struct AnswerChoice: Hashable, Identifiable {
    let value: Int
    let isCorrect: Bool
    var id: Int { value }
}

// MARK: - Paths

/// A themed run of formulas the child plays in order — Sum's gamified rows.
struct SumPath: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var emoji: String
    var formulas: [Formula]
    let isCustom: Bool
    var isHidden: Bool
    var sortOrder: Int
}

/// A Parent Mode edit of a default path, keyed by path ID and language.
struct SumPathOverride: Codable, Hashable {
    let pathID: String
    let languageCode: String
    var title: String?
    var emoji: String?
    var formulas: [Formula]?
    var isHidden: Bool = false
    var sortOrder: Int?

    var isEmpty: Bool {
        title == nil && emoji == nil && formulas == nil && !isHidden && sortOrder == nil
    }
}

// MARK: - Play state

enum SumPlayState: Equatable {
    case idle
    /// Free play: the child is typing on the keypad.
    case building
    case presenting
    case speakingFormula
    case choosing
    case processing
    case retrying(attempt: Int)
    case celebrating
    case completed
}

// MARK: - Session

struct SumSession {
    /// nil → free play.
    let path: SumPath?
    var currentIndex: Int = 0
    var completedCount: Int = 0
    var skippedCount: Int = 0

    var currentFormula: Formula? {
        guard let path, path.formulas.indices.contains(currentIndex) else { return nil }
        return path.formulas[currentIndex]
    }

    var isFinished: Bool {
        guard let path else { return false }
        return currentIndex >= path.formulas.count
    }
}
