import Foundation
import TikoKit

/// Bundled defaults: operator vocabulary per language and the difficulty
/// presets. Operator pronunciations are editable per language; presets are
/// fixed rungs on the ladder — a parent who wants their own fixed sums writes
/// a path instead.
enum SumCatalog {
    static let contentLanguages = ["en", "nl", "fr", "es", "de", "mt"]

    // MARK: - Operator vocabulary (spoken words)

    struct OperatorWords: Codable, Hashable {
        var plus: String
        var minus: String
        var times: String
        var dividedBy: String
        var equals: String

        func word(for op: SumOperator) -> String {
            switch op {
            case .plus: return plus
            case .minus: return minus
            case .times: return times
            case .dividedBy: return dividedBy
            }
        }
    }

    static func defaultOperatorWords(language: String) -> OperatorWords {
        switch TikoLanguageCode.normalized(language) {
        case "nl":
            return OperatorWords(plus: "plus", minus: "min", times: "keer", dividedBy: "gedeeld door", equals: "is")
        case "fr":
            return OperatorWords(plus: "plus", minus: "moins", times: "fois", dividedBy: "divisé par", equals: "égale")
        case "es":
            return OperatorWords(plus: "más", minus: "menos", times: "por", dividedBy: "dividido por", equals: "es")
        case "de":
            return OperatorWords(plus: "plus", minus: "minus", times: "mal", dividedBy: "geteilt durch", equals: "ist")
        case "mt":
            return OperatorWords(plus: "u", minus: "neqes", times: "darba", dividedBy: "maqsum fuq", equals: "huma")
        default:
            return OperatorWords(plus: "plus", minus: "minus", times: "times", dividedBy: "divided by", equals: "is")
        }
    }

    // MARK: - Difficulty presets

    /// Media-library categories fetched to dress the preset tiles.
    static let mediaCategories = ["numbers", "animals", "food", "transport"]

    /// Four rungs, numbers only. Every preset plays any operator the child
    /// picks, so difficulty is the single thing the home screen asks about.
    static let presets: [SumPreset] = [
        SumPreset(id: "to10", maxNumber: 10, emoji: "🍎", mediaMatchKey: "apple"),
        SumPreset(id: "to20", maxNumber: 20, emoji: "🚀", mediaMatchKey: "rocket"),
        SumPreset(id: "to50", maxNumber: 50, emoji: "🐙", mediaMatchKey: "octopus"),
        SumPreset(id: "to100", maxNumber: 100, emoji: "🐘", mediaMatchKey: "elephant"),
    ]
}
