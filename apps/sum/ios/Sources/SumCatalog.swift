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

    // MARK: Modes

    /// The ladder: how far the numbers go. Every rung plays whichever operator
    /// the child picked in the header.
    static let ranges: [SumPreset] = [
        SumPreset(id: "to5", kind: .range(min: 1, max: 5), emoji: "🐣", mediaMatchKey: "chick"),
        SumPreset(id: "to10", kind: .range(min: 1, max: 10), emoji: "🍎", mediaMatchKey: "apple"),
        SumPreset(id: "to20", kind: .range(min: 1, max: 20), emoji: "🚀", mediaMatchKey: "rocket"),
        SumPreset(id: "to50", kind: .range(min: 1, max: 50), emoji: "🐙", mediaMatchKey: "octopus"),
        SumPreset(id: "to100", kind: .range(min: 1, max: 100), emoji: "🐘", mediaMatchKey: "elephant"),
    ]

    /// Bands for the child who has the small numbers and needs the middle of
    /// the range instead of starting from one every time.
    static let bands: [SumPreset] = [
        SumPreset(id: "band10to20", kind: .range(min: 10, max: 20), emoji: "🦊", mediaMatchKey: "fox"),
        SumPreset(id: "band20to50", kind: .range(min: 20, max: 50), emoji: "🐬", mediaMatchKey: "dolphin"),
        SumPreset(id: "band50to100", kind: .range(min: 50, max: 100), emoji: "🦁", mediaMatchKey: "lion"),
    ]

    /// The number families — the 2s, the 5s, the 10s. With × these are the
    /// times tables; with + counting on; with − counting back; with ÷ sharing.
    static let families: [SumPreset] = [
        SumPreset(id: "family2", kind: .family(n: 2), emoji: "🐞", mediaMatchKey: "ladybug"),
        SumPreset(id: "family3", kind: .family(n: 3), emoji: "🐸", mediaMatchKey: "frog"),
        SumPreset(id: "family4", kind: .family(n: 4), emoji: "🐝", mediaMatchKey: "bee"),
        SumPreset(id: "family5", kind: .family(n: 5), emoji: "⭐️", mediaMatchKey: "star"),
        SumPreset(id: "family6", kind: .family(n: 6), emoji: "🎲", mediaMatchKey: "dice"),
        SumPreset(id: "family7", kind: .family(n: 7), emoji: "🌈", mediaMatchKey: "rainbow"),
        SumPreset(id: "family8", kind: .family(n: 8), emoji: "🕷️", mediaMatchKey: "spider"),
        SumPreset(id: "family9", kind: .family(n: 9), emoji: "🐱", mediaMatchKey: "cat"),
        SumPreset(id: "family10", kind: .family(n: 10), emoji: "🖐️", mediaMatchKey: "hand"),
    ]

    /// Everything, in the order the home screen lays it out.
    static let presets: [SumPreset] = ranges + bands + families
}
