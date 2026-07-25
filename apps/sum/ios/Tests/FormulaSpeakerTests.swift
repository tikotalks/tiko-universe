import XCTest
@testable import TikoSum

final class FormulaSpeakerTests: XCTestCase {
    func testEnglishFormulaUtterance() {
        let speaker = FormulaSpeaker(languageCode: "en")
        XCTAssertEqual(
            speaker.formulaUtterance(Formula(a: 3, op: .plus, b: 5)),
            "three plus five is"
        )
        XCTAssertEqual(
            speaker.formulaUtterance(Formula(a: 20, op: .dividedBy, b: 10)),
            "twenty divided by ten is"
        )
    }

    func testDutchFormulaUtterance() {
        let speaker = FormulaSpeaker(languageCode: "nl")
        XCTAssertEqual(
            speaker.formulaUtterance(Formula(a: 21, op: .plus, b: 5)),
            "eenentwintig plus vijf is"
        )
        XCTAssertEqual(
            speaker.formulaUtterance(Formula(a: 6, op: .times, b: 5)),
            "zes keer vijf is"
        )
    }

    func testMalteseFormulaUtterance() {
        let speaker = FormulaSpeaker(languageCode: "mt")
        XCTAssertEqual(
            speaker.formulaUtterance(Formula(a: 2, op: .plus, b: 2)),
            "tnejn u tnejn huma"
        )
    }

    func testCustomOperatorWordsAreUsed() {
        let words = SumCatalog.OperatorWords(plus: "and", minus: "minus", times: "times", dividedBy: "divided by", equals: "makes")
        let speaker = FormulaSpeaker(languageCode: "en", words: words)
        XCTAssertEqual(
            speaker.formulaUtterance(Formula(a: 1, op: .plus, b: 2)),
            "one and two makes"
        )
    }

    func testPrefetchTextsCoverFormulasAndResults() {
        let speaker = FormulaSpeaker(languageCode: "en")
        let formulas = [Formula(a: 3, op: .plus, b: 5), Formula(a: 2, op: .plus, b: 2)]
        let texts = Set(speaker.prefetchTexts(for: formulas))
        XCTAssertTrue(texts.contains("three plus five is"))
        XCTAssertTrue(texts.contains("eight"))
        XCTAssertTrue(texts.contains("four"))
    }

    func testKeypadPrefetchCoversRangeAndOperators() {
        let speaker = FormulaSpeaker(languageCode: "en")
        let texts = Set(speaker.keypadPrefetchTexts(maxNumber: 20))
        XCTAssertTrue(texts.contains("zero"))
        XCTAssertTrue(texts.contains("twenty"))
        XCTAssertTrue(texts.contains("divided by"))
        XCTAssertTrue(texts.contains("is"))
        XCTAssertFalse(texts.contains("twenty-one"))
    }
}
