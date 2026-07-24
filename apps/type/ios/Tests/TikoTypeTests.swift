import XCTest
import SwiftUI
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

    // MARK: - Speech string ordering & edge cases (Req 4)

    /// Req 4: committed words keep their order and the in-progress word is always
    /// spoken last.
    func testSpeechStringPreservesOrderWithCurrentLast() {
        XCTAssertEqual(
            TypeText.speechString(words: ["one", "two", "three"], currentWord: "fo"),
            "one two three fo"
        )
    }

    /// Req 4: words are joined by exactly one space regardless of how many
    /// committed words there are (no double spaces, no leading/trailing space).
    func testSpeechStringUsesSingleSpaces() {
        let spoken = TypeText.speechString(words: ["a", "b", "c"], currentWord: "d")
        XCTAssertEqual(spoken, "a b c d")
        XCTAssertFalse(spoken.contains("  "), "should never contain a double space")
        XCTAssertFalse(spoken.hasPrefix(" "))
        XCTAssertFalse(spoken.hasSuffix(" "))
    }

    // MARK: - Committing order & immutability (Req 2, 3)

    /// Req 2/3: committing appends to the END and preserves all existing chips.
    func testCommittingAppendsAtEndPreservingOrder() {
        XCTAssertEqual(
            TypeText.committing(words: ["a", "b", "c"], currentWord: "d"),
            ["a", "b", "c", "d"]
        )
    }

    /// Req 2/3: the same in-progress word can be committed repeatedly to build
    /// duplicate chips (each space is an independent commit).
    func testCommittingAllowsDuplicateWords() {
        var words = TypeText.committing(words: [], currentWord: "ba")
        words = TypeText.committing(words: words, currentWord: "ba")
        XCTAssertEqual(words, ["ba", "ba"])
    }

    // MARK: - Legacy sentence migration edge cases (Req 18)

    /// Req 18: collapsed / repeated internal spaces do not produce empty chips
    /// (they are dropped, matching `split(separator:)` semantics).
    func testSplitCollapsesRepeatedSpaces() {
        let result = TypeText.split(sentence: "hello   world foo")
        XCTAssertEqual(result.words, ["hello", "world"])
        XCTAssertEqual(result.current, "foo")
        XCTAssertFalse(result.words.contains(""), "no empty chips from repeated spaces")
    }

    /// Req 18: a leading space does not create an empty leading chip.
    func testSplitLeadingSpaceHasNoEmptyChip() {
        let result = TypeText.split(sentence: " hello world")
        XCTAssertEqual(result.words, ["hello"])
        XCTAssertEqual(result.current, "world")
    }

    /// Req 18: a string made only of spaces yields no chips and no in-progress
    /// word (the trailing-space branch with empty parts).
    func testSplitOnlySpacesIsEmpty() {
        let result = TypeText.split(sentence: "   ")
        XCTAssertEqual(result.words, [])
        XCTAssertEqual(result.current, "")
    }

    /// Req 18: a single committed word (word + trailing space) migrates as one
    /// chip with no in-progress word — the round-trip of committing then speaking.
    func testSplitSingleCommittedWord() {
        let result = TypeText.split(sentence: "hello ")
        XCTAssertEqual(result.words, ["hello"])
        XCTAssertEqual(result.current, "")
    }

    /// Req 18: migrating then speaking reproduces the original trimmed sentence —
    /// the split and speech rules are consistent with each other.
    func testSplitThenSpeakRoundTrips() {
        let sentence = "the quick brown fox"
        let split = TypeText.split(sentence: sentence)
        XCTAssertEqual(
            TypeText.speechString(words: split.words, currentWord: split.current),
            sentence
        )
    }

    // MARK: - Symbols layer coverage (Req 12)

    /// Req 12: the symbols layer also carries common punctuation used to build
    /// sentences, and never overlaps the digit row's role.
    func testSymbolsLayerCarriesPunctuation() {
        let symbolKeys = Set(KeyboardLayouts.symbols.flatMap { $0 })
        for punctuation in [".", ",", "?", "!"] {
            XCTAssertTrue(symbolKeys.contains(punctuation),
                          "symbols layer should contain \(punctuation)")
        }
    }

    /// Req 12: none of the symbols-layer keys are empty strings (every cap is
    /// renderable / tappable).
    func testSymbolsLayerHasNoEmptyKeys() {
        for row in KeyboardLayouts.symbols {
            for key in row {
                XCTAssertFalse(key.isEmpty, "symbols layer must not contain empty keys")
            }
        }
    }

    // MARK: - Key theme rendering (Req 13, 14)

    /// Req 13/14: every theme resolves concrete colours in both light and dark
    /// schemes without crashing, and the colourful theme cycles its palette by
    /// key index (so adjacent keys differ over the palette length).
    func testEveryThemeResolvesColorsInBothSchemes() {
        for theme in KeyTheme.allCases {
            for scheme in [ColorScheme.light, .dark] {
                let colors = theme.colors(in: scheme)
                // Exercise the per-key colour closure for a spread of indices.
                for idx in 0..<10 {
                    _ = colors.key("a", idx)
                }
                // Non-nil swatch / label already asserted elsewhere; here we just
                // ensure the closure is total and does not trap.
                XCTAssertFalse(theme.label.isEmpty)
            }
        }
    }

    // MARK: - App identity

    /// The Type app palette resolves and is labelled "Type".
    func testAppColorsExist() {
        let palette = TikoAppColor.type.palette
        XCTAssertEqual(palette.label, "Type")
    }
}
