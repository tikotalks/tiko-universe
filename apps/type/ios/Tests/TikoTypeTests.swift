import XCTest
@testable import TikoType
import TikoKit

/// Requirements-based unit tests for Tiko Type.
///
/// These cover the testable logic: the word-chip building and speech-string
/// rules (`TypeText`), the keyboard-layout catalog / lookup / alphabet coverage,
/// the key-theme catalog / lookup, and the legacy-sentence migration split.
/// See `REQUIREMENTS.md` for the requirement each test maps to.
final class TikoTypeTests: XCTestCase {

    // MARK: - Speech string (Req 4)

    /// Req 4: the spoken sentence is every committed word plus the in-progress
    /// word, joined by single spaces.
    func testSpeechStringJoinsWordsAndCurrent() {
        XCTAssertEqual(TypeText.speechString(words: ["hello", "there"], currentWord: "wor"),
                       "hello there wor")
    }

    /// Req 4: when there is no in-progress word, only the committed words are
    /// spoken (no trailing space).
    func testSpeechStringOmitsEmptyCurrent() {
        XCTAssertEqual(TypeText.speechString(words: ["hello", "world"], currentWord: ""),
                       "hello world")
    }

    /// Req 4: nothing typed yet → empty string (the speak button is a no-op).
    func testSpeechStringEmptyWhenNothingTyped() {
        XCTAssertEqual(TypeText.speechString(words: [], currentWord: ""), "")
    }

    /// A single in-progress word with no committed words speaks just that word.
    func testSpeechStringSingleCurrentWord() {
        XCTAssertEqual(TypeText.speechString(words: [], currentWord: "hi"), "hi")
    }

    // MARK: - Word-chip building via space (Req 2, 3)

    /// Req 2 / 3: committing the in-progress word (space key) appends it as a new
    /// chip at the end of the sentence.
    func testCommittingBuildsWordChips() {
        XCTAssertEqual(TypeText.committing(words: ["hello"], currentWord: "world"),
                       ["hello", "world"])
        // Building from empty produces the first chip.
        XCTAssertEqual(TypeText.committing(words: [], currentWord: "hi"), ["hi"])
    }

    /// Req 3: committing an empty in-progress word does nothing — no empty chips.
    func testCommittingEmptyWordIsNoOp() {
        XCTAssertEqual(TypeText.committing(words: ["hello"], currentWord: ""), ["hello"])
        XCTAssertEqual(TypeText.committing(words: [], currentWord: ""), [])
    }

    // MARK: - Legacy sentence migration (Req 18)

    /// Req 18: a legacy sentence without a trailing space splits into committed
    /// words plus a trailing in-progress word (the last, still-being-typed word).
    func testSplitLegacySentence() {
        let result = TypeText.split(sentence: "hello there wor")
        XCTAssertEqual(result.words, ["hello", "there"])
        XCTAssertEqual(result.current, "wor")
    }

    /// Req 18: a trailing space means the last word was already committed, so
    /// there is no in-progress word.
    func testSplitTrailingSpaceHasNoCurrent() {
        let result = TypeText.split(sentence: "hello world ")
        XCTAssertEqual(result.words, ["hello", "world"])
        XCTAssertEqual(result.current, "")
    }

    /// Req 18: an empty legacy string yields no chips and no in-progress word.
    func testSplitEmptyIsEmpty() {
        let result = TypeText.split(sentence: "")
        XCTAssertEqual(result.words, [])
        XCTAssertEqual(result.current, "")
    }

    /// A single word with no space is treated as the in-progress word.
    func testSplitSingleWordIsCurrent() {
        let result = TypeText.split(sentence: "hi")
        XCTAssertEqual(result.words, [])
        XCTAssertEqual(result.current, "hi")
    }

    // MARK: - Keyboard layout catalog & lookup (Req 9, 10)

    /// Req 9: all five keyboard layouts are offered.
    func testLayoutCatalog() {
        let ids = KeyboardLayouts.all.map(\.id)
        XCTAssertEqual(Set(ids), ["qwerty", "abc", "azerty", "qwertz", "dvorak"])
    }

    /// Req 9: QWERTY is the first / default layout.
    func testDefaultLayoutIsQwerty() {
        XCTAssertEqual(KeyboardLayouts.all.first?.id, "qwerty")
    }

    /// Req 10: looking a layout up by id returns that exact layout.
    func testLayoutLookupByID() {
        XCTAssertEqual(KeyboardLayouts.layout(for: "azerty").id, "azerty")
        XCTAssertEqual(KeyboardLayouts.layout(for: "dvorak").label, "Dvorak")
    }

    /// Req 10: an unknown id falls back to the first (QWERTY) so the keyboard is
    /// always renderable.
    func testUnknownLayoutFallsBackToDefault() {
        XCTAssertEqual(KeyboardLayouts.layout(for: "not-a-layout").id, "qwerty")
    }

    /// Req 11: every layout's letter rows cover the full 26-letter alphabet
    /// exactly once (no missing or duplicate letters). Dvorak also carries
    /// punctuation keys, so we assert the alphabet is a subset there.
    func testLayoutsCoverAlphabet() {
        let alphabet = Set("abcdefghijklmnopqrstuvwxyz".map(String.init))
        for layout in KeyboardLayouts.all {
            let keys = layout.rows.flatMap { $0 }
            let letters = Set(keys).intersection(alphabet)
            XCTAssertEqual(letters, alphabet,
                           "\(layout.id) is missing letters: \(alphabet.subtracting(letters).sorted())")
            // The pure alphabetic layouts have no duplicate letters.
            if ["qwerty", "abc", "qwertz"].contains(layout.id) {
                XCTAssertEqual(keys.count, Set(keys).count, "\(layout.id) has duplicate keys")
            }
        }
    }

    /// Req 12: a symbols / numbers layer is available with the digits 0–9.
    func testSymbolsLayerPresent() {
        let symbolKeys = Set(KeyboardLayouts.symbols.flatMap { $0 })
        for digit in "0123456789".map(String.init) {
            XCTAssertTrue(symbolKeys.contains(digit), "symbols layer should contain \(digit)")
        }
    }

    // MARK: - Key theme catalog & lookup (Req 13, 14)

    /// Req 13: all six key themes are offered.
    func testThemeCatalog() {
        let ids = KeyTheme.allCases.map(\.rawValue)
        XCTAssertEqual(Set(ids), ["classic", "warm", "cool", "colorful", "contrast", "ghost"])
    }

    /// Req 13: Classic is the first / default theme.
    func testDefaultThemeIsClassic() {
        XCTAssertEqual(KeyTheme.allCases.first, .classic)
        XCTAssertEqual(KeyTheme.classic.rawValue, "classic")
    }

    /// Req 14: looking a theme up by its stored raw value returns that theme.
    func testThemeLookupByRawValue() {
        XCTAssertEqual(KeyTheme(rawValue: "colorful"), .colorful)
        XCTAssertEqual(KeyTheme(rawValue: "ghost")?.label, "Ghost")
    }

    /// Req 14: an unknown stored value falls back to Classic (as the view does
    /// via `KeyTheme(rawValue:) ?? .classic`).
    func testUnknownThemeFallsBackToClassic() {
        XCTAssertEqual(KeyTheme(rawValue: "not-a-theme") ?? .classic, .classic)
    }

    // MARK: - App identity

    /// The Type app palette resolves and is labelled "Type".
    func testAppColorsExist() {
        let palette = TikoAppColor.type.palette
        XCTAssertEqual(palette.label, "Type")
    }
}
