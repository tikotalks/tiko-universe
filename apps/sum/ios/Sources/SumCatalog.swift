import Foundation
import TikoKit

/// Bundled defaults: operator vocabulary per language and the twelve default
/// paths. These are defaults, not fixed content — `SumPathStore` layers Parent
/// Mode overrides on top, and operator pronunciations are editable per
/// language too.
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

    // MARK: - Default paths

    struct DefaultPath {
        let id: String
        let titleKey: String
        let emoji: String
        /// English noun used to match a Tiko media-library image for the tile.
        let mediaMatchKey: String
        let sortOrder: Int
        let formulas: [Formula]
    }

    /// Media-library categories fetched to dress the path tiles.
    static let mediaCategories = ["numbers", "animals", "food", "transport"]

    private static func f(_ a: Int, _ op: SumOperator, _ b: Int) -> Formula {
        let formula = Formula(a: a, op: op, b: b)
        assert(formula.isValid, "invalid default formula \(a) \(op) \(b)")
        return formula
    }

    static let defaultPaths: [DefaultPath] = [
        DefaultPath(id: "counting", titleKey: "sum.path.counting", emoji: "🐣", mediaMatchKey: "chicken", sortOrder: 0, formulas: [
            f(1, .plus, 1), f(2, .plus, 1), f(1, .plus, 2), f(3, .plus, 1), f(2, .plus, 2),
        ]),
        DefaultPath(id: "add10", titleKey: "sum.path.add10", emoji: "🍎", mediaMatchKey: "apple", sortOrder: 1, formulas: [
            f(3, .plus, 4), f(5, .plus, 2), f(6, .plus, 3), f(4, .plus, 4), f(7, .plus, 3),
        ]),
        DefaultPath(id: "add20", titleKey: "sum.path.add20", emoji: "🚀", mediaMatchKey: "rocket", sortOrder: 2, formulas: [
            f(12, .plus, 5), f(8, .plus, 7), f(14, .plus, 3), f(9, .plus, 8), f(11, .plus, 9),
        ]),
        DefaultPath(id: "add100", titleKey: "sum.path.add100", emoji: "🐘", mediaMatchKey: "elephant", sortOrder: 3, formulas: [
            f(20, .plus, 30), f(40, .plus, 40), f(60, .plus, 30), f(50, .plus, 50), f(70, .plus, 20),
        ]),
        DefaultPath(id: "sub10", titleKey: "sum.path.sub10", emoji: "🍪", mediaMatchKey: "cookie", sortOrder: 4, formulas: [
            f(5, .minus, 2), f(8, .minus, 3), f(10, .minus, 4), f(7, .minus, 5), f(9, .minus, 6),
        ]),
        DefaultPath(id: "sub20", titleKey: "sum.path.sub20", emoji: "🎈", mediaMatchKey: "balloon", sortOrder: 5, formulas: [
            f(15, .minus, 5), f(18, .minus, 9), f(20, .minus, 7), f(16, .minus, 8), f(13, .minus, 6),
        ]),
        DefaultPath(id: "tens", titleKey: "sum.path.tens", emoji: "🔟", mediaMatchKey: "ten", sortOrder: 6, formulas: [
            f(10, .plus, 10), f(20, .plus, 10), f(30, .plus, 20), f(50, .plus, 10), f(40, .plus, 20),
        ]),
        DefaultPath(id: "doubles", titleKey: "sum.path.doubles", emoji: "👯", mediaMatchKey: "twins", sortOrder: 7, formulas: [
            f(2, .plus, 2), f(3, .plus, 3), f(4, .plus, 4), f(5, .plus, 5), f(6, .plus, 6),
        ]),
        DefaultPath(id: "times2", titleKey: "sum.path.times2", emoji: "🦋", mediaMatchKey: "butterfly", sortOrder: 8, formulas: [
            f(2, .times, 2), f(3, .times, 2), f(4, .times, 2), f(5, .times, 2), f(6, .times, 2),
        ]),
        DefaultPath(id: "times5", titleKey: "sum.path.times5", emoji: "🖐️", mediaMatchKey: "hand", sortOrder: 9, formulas: [
            f(2, .times, 5), f(3, .times, 5), f(4, .times, 5), f(5, .times, 5), f(6, .times, 5),
        ]),
        DefaultPath(id: "times10", titleKey: "sum.path.times10", emoji: "🐙", mediaMatchKey: "octopus", sortOrder: 10, formulas: [
            f(2, .times, 10), f(3, .times, 10), f(4, .times, 10), f(5, .times, 10), f(10, .times, 10),
        ]),
        DefaultPath(id: "shares", titleKey: "sum.path.shares", emoji: "🍕", mediaMatchKey: "pizza", sortOrder: 11, formulas: [
            f(6, .dividedBy, 2), f(10, .dividedBy, 5), f(8, .dividedBy, 2), f(9, .dividedBy, 3), f(20, .dividedBy, 10),
        ]),
    ]

    /// Resolves a default path with its localized title.
    @MainActor
    static func path(_ defaultPath: DefaultPath, i18n: TikoI18n) -> SumPath {
        SumPath(
            id: defaultPath.id,
            title: i18n.t(defaultPath.titleKey),
            emoji: defaultPath.emoji,
            formulas: defaultPath.formulas,
            isCustom: false,
            isHidden: false,
            sortOrder: defaultPath.sortOrder
        )
    }
}
