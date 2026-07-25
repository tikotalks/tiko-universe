import Foundation
import TikoKit

/// Renders numbers, operators, and whole formulas as spoken utterances in the
/// active language, using `NumberSpeller` for the number grammar and the
/// (parent-editable) operator vocabulary.
struct FormulaSpeaker {
    let languageCode: String
    let words: SumCatalog.OperatorWords

    init(languageCode: String, words: SumCatalog.OperatorWords? = nil) {
        self.languageCode = languageCode
        self.words = words ?? SumCatalog.defaultOperatorWords(language: languageCode)
    }

    func number(_ n: Int) -> String {
        NumberSpeller.spell(n, language: languageCode)
    }

    func operatorWord(_ op: SumOperator) -> String {
        words.word(for: op)
    }

    var equalsWord: String { words.equals }

    /// "three plus five is…" — the full formula in one breath.
    func formulaUtterance(_ formula: Formula) -> String {
        "\(number(formula.a)) \(operatorWord(formula.op)) \(number(formula.b)) \(equalsWord)"
    }

    /// The formula split the way it lands on screen: "three", "plus", "five".
    /// Each part is spoken as its tile pops in, so the voice and the display
    /// tell the same story at the same speed.
    func partTexts(_ formula: Formula) -> [String] {
        [number(formula.a), operatorWord(formula.op), number(formula.b)]
    }

    /// Everything a session might say — used to prefetch the voice cache so
    /// play works offline.
    func prefetchTexts(for formulas: [Formula]) -> [String] {
        var texts = Set<String>()
        for formula in formulas {
            texts.formUnion(partTexts(formula))
            texts.insert(formulaUtterance(formula))
            if let result = formula.result {
                texts.insert(number(result))
            }
        }
        return Array(texts)
    }

    /// Keypad prefetch: all numbers up to the free-play maximum plus the
    /// operator and equals words.
    func keypadPrefetchTexts(maxNumber: Int) -> [String] {
        var texts = (0...max(0, min(100, maxNumber))).map { number($0) }
        texts.append(contentsOf: SumOperator.allCases.map { operatorWord($0) })
        texts.append(equalsWord)
        return texts
    }
}
