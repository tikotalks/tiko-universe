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

    /// What a parent has left switched on. Plus is never hideable — a Sum with
    /// no operators would have nothing to practise.
    static func enabled(minus: Bool, times: Bool, divide: Bool) -> [SumOperator] {
        var ops: [SumOperator] = [.plus]
        if minus { ops.append(.minus) }
        if times { ops.append(.times) }
        if divide { ops.append(.dividedBy) }
        return ops
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

// MARK: - Presets

/// A difficulty preset — nothing but "how big do the numbers get". Which
/// operators to practise is picked inside the game, so + − × ÷ never fragment
/// the home screen into a dozen near-identical tiles.
struct SumPreset: Identifiable, Hashable {
    let id: String
    let maxNumber: Int
    let emoji: String
    /// English noun used to match a Tiko media-library image for the tile.
    let mediaMatchKey: String

    var label: String { "\(maxNumber)" }
}

/// Difficulty plus the operators the child picked — kept for the whole run so
/// "play again" deals a brand-new ten instead of repeating the same sums.
struct SumRunSpec: Equatable, Hashable {
    let preset: SumPreset
    let operators: [SumOperator]

    func makeGame() -> SumGame {
        SumGame(
            id: "\(preset.id)-\(operators.map(\.rawValue).joined(separator: "-"))",
            emoji: preset.emoji,
            formulas: SumGenerator.round(maxNumber: preset.maxNumber, operators: operators)
        )
    }
}

// MARK: - Game

/// One playable run of formulas. Presets generate theirs at random; a
/// parent-authored path carries its own fixed list.
struct SumGame: Identifiable, Hashable {
    let id: String
    let emoji: String
    let formulas: [Formula]

    init(id: String, emoji: String, formulas: [Formula]) {
        self.id = id
        self.emoji = emoji
        self.formulas = formulas
    }

    init(path: SumPath) {
        self.init(id: path.id, emoji: path.emoji, formulas: path.formulas)
    }
}

// MARK: - Paths (parent-authored runs)

/// A named run of fixed formulas a parent wrote by hand. Presets cover the
/// everyday ladder; paths exist for the family that wants its own set.
struct SumPath: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var emoji: String
    var formulas: [Formula]
    var isHidden: Bool
    var sortOrder: Int
}

// MARK: - Play state

enum SumPlayState: Equatable {
    case idle
    /// Free play: the child is typing on the keypad.
    case building
    /// The formula is popping in part by part, spoken as each part lands.
    case revealing
    case choosing
    case celebrating
    case completed
}

// MARK: - Session

struct SumSession {
    /// nil → free play.
    let game: SumGame?
    var currentIndex: Int = 0
    var completedCount: Int = 0
    var skippedCount: Int = 0

    var total: Int { game?.formulas.count ?? 0 }

    var currentFormula: Formula? { formula(at: currentIndex) }

    /// The one after this — prerendered while the child answers the current.
    var nextFormula: Formula? { formula(at: currentIndex + 1) }

    var isFinished: Bool {
        guard let game else { return false }
        return currentIndex >= game.formulas.count
    }

    private func formula(at index: Int) -> Formula? {
        guard let game, game.formulas.indices.contains(index) else { return nil }
        return game.formulas[index]
    }
}
