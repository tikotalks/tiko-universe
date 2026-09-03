import XCTest
import SwiftUI
@testable import TikoType
import TikoKit

/// Requirements-based unit tests for Tiko Type.
///
/// These cover the testable logic: the word-chip building and speech-string rules
/// (`TypeText`), the keyboard arrangement engine (`KeyboardAlphabet`,
/// `KeyboardLayoutDefinition`, `KeyGeometry`), the letterboard (`LetterboardBoard`), and
/// the key-theme catalogue. See `REQUIREMENTS.md` for the requirement each test maps to.
final class TikoTypeTests: XCTestCase {

    /// Every language the arrangement engine is exercised against: the seven with an
    /// alphabet of their own, plus three that fall through to Latin.
    private let languages = ["en", "nl", "de", "fr", "es", "mt", "ru", "hy", "pt", "ja", "ar"]

    /// Column arithmetic is in `Double`, and a row built from `columns / 10` can land a
    /// few ulps off the row above it. A keyboard is a rectangle to within this, not to the
    /// last bit.
    private let columnTolerance = 1e-9

    // MARK: - Speech string (Req 4)

    /// Req 4: the spoken sentence is every committed word plus the in-progress word,
    /// joined by single spaces.
    func testSpeechStringJoinsWordsAndCurrent() {
        XCTAssertEqual(TypeText.speechString(words: ["hello", "there"], currentWord: "wor"),
                       "hello there wor")
    }

    /// Req 4: when there is no in-progress word, only the committed words are spoken (no
    /// trailing space).
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

    /// Req 4: committed words keep their order and the in-progress word is always spoken
    /// last.
    func testSpeechStringPreservesOrderWithCurrentLast() {
        XCTAssertEqual(
            TypeText.speechString(words: ["one", "two", "three"], currentWord: "fo"),
            "one two three fo"
        )
    }

    /// Req 4: words are joined by exactly one space regardless of how many committed words
    /// there are (no double spaces, no leading/trailing space).
    func testSpeechStringUsesSingleSpaces() {
        let spoken = TypeText.speechString(words: ["a", "b", "c"], currentWord: "d")
        XCTAssertEqual(spoken, "a b c d")
        XCTAssertFalse(spoken.contains("  "), "should never contain a double space")
        XCTAssertFalse(spoken.hasPrefix(" "))
        XCTAssertFalse(spoken.hasSuffix(" "))
    }

    // MARK: - Word-chip building via space (Req 2, 3)

    /// Req 2 / 3: committing the in-progress word (space key) appends it as a new chip at
    /// the end of the sentence.
    func testCommittingBuildsWordChips() {
        XCTAssertEqual(TypeText.committing(words: ["hello"], currentWord: "world"),
                       ["hello", "world"])
        XCTAssertEqual(TypeText.committing(words: [], currentWord: "hi"), ["hi"])
    }

    /// Req 3: committing an empty in-progress word does nothing — no empty chips.
    func testCommittingEmptyWordIsNoOp() {
        XCTAssertEqual(TypeText.committing(words: ["hello"], currentWord: ""), ["hello"])
        XCTAssertEqual(TypeText.committing(words: [], currentWord: ""), [])
    }

    /// Req 2/3: committing appends to the END and preserves all existing chips.
    func testCommittingAppendsAtEndPreservingOrder() {
        XCTAssertEqual(
            TypeText.committing(words: ["a", "b", "c"], currentWord: "d"),
            ["a", "b", "c", "d"]
        )
    }

    /// Req 2/3: the same in-progress word can be committed repeatedly to build duplicate
    /// chips (each space is an independent commit).
    func testCommittingAllowsDuplicateWords() {
        var words = TypeText.committing(words: [], currentWord: "ba")
        words = TypeText.committing(words: words, currentWord: "ba")
        XCTAssertEqual(words, ["ba", "ba"])
    }

    // MARK: - Legacy sentence migration (Req 18)

    /// Req 18: a legacy sentence without a trailing space splits into committed words plus
    /// a trailing in-progress word.
    func testSplitLegacySentence() {
        let result = TypeText.split(sentence: "hello there wor")
        XCTAssertEqual(result.words, ["hello", "there"])
        XCTAssertEqual(result.current, "wor")
    }

    /// Req 18: a trailing space means the last word was already committed, so there is no
    /// in-progress word.
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

    /// Req 18: collapsed / repeated internal spaces do not produce empty chips.
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

    /// Req 18: a string made only of spaces yields no chips and no in-progress word.
    func testSplitOnlySpacesIsEmpty() {
        let result = TypeText.split(sentence: "   ")
        XCTAssertEqual(result.words, [])
        XCTAssertEqual(result.current, "")
    }

    /// Req 18: a single committed word migrates as one chip with no in-progress word.
    func testSplitSingleCommittedWord() {
        let result = TypeText.split(sentence: "hello ")
        XCTAssertEqual(result.words, ["hello"])
        XCTAssertEqual(result.current, "")
    }

    /// Req 18: migrating then speaking reproduces the original sentence.
    func testSplitThenSpeakRoundTrips() {
        let sentence = "the quick brown fox"
        let split = TypeText.split(sentence: sentence)
        XCTAssertEqual(
            TypeText.speechString(words: split.words, currentWord: split.current),
            sentence
        )
    }

    // MARK: - Arrangement catalogue & lookup (Req 9, 10)

    /// Req 9: eight arrangements are offered, and Familiar is the first — the one that
    /// follows the language rather than making somebody name a keyboard.
    func testLayoutCatalog() {
        XCTAssertEqual(
            Set(KeyboardLayouts.all.map(\.id)),
            ["familiar", "qwerty", "azerty", "qwertz", "jcuken", "dvorak", "abc", "large"]
        )
        XCTAssertEqual(KeyboardLayouts.all.first, .familiar)
    }

    /// Req 10: looking an arrangement up by id returns that exact arrangement.
    func testLayoutLookupByID() {
        XCTAssertEqual(KeyboardLayouts.layout(for: "azerty"), .azerty)
        XCTAssertEqual(KeyboardLayouts.layout(for: "dvorak").label, "Dvorak")
        XCTAssertEqual(KeyboardLayouts.layout(for: "large").label, "Large keys")
    }

    /// Req 10: an unknown stored id falls back to Familiar, so the keyboard is always
    /// renderable and always one this language's typists recognise.
    func testUnknownLayoutFallsBackToFamiliar() {
        XCTAssertEqual(KeyboardLayouts.layout(for: "not-a-layout"), .familiar)
    }

    /// Req 9: Familiar is not one arrangement — it is whichever one this language's
    /// typists actually use.
    func testFamiliarFollowsTheLanguage() {
        XCTAssertEqual(TypeKeyboardLayout.familiarArrangement(forLanguageCode: "en"), .qwerty)
        XCTAssertEqual(TypeKeyboardLayout.familiarArrangement(forLanguageCode: "nl"), .qwerty)
        XCTAssertEqual(TypeKeyboardLayout.familiarArrangement(forLanguageCode: "de"), .qwertz)
        XCTAssertEqual(TypeKeyboardLayout.familiarArrangement(forLanguageCode: "fr"), .azerty)
        XCTAssertEqual(TypeKeyboardLayout.familiarArrangement(forLanguageCode: "ru"), .jcuken)
        // Armenian ships no familiar arrangement, so it gets the alphabet in its own
        // order — a complete Armenian keyboard, not a shrug.
        XCTAssertEqual(TypeKeyboardLayout.familiarArrangement(forLanguageCode: "hy"), .abc)
        // A language with no arrangement of its own still gets a real keyboard.
        XCTAssertEqual(TypeKeyboardLayout.familiarArrangement(forLanguageCode: "pt"), .qwerty)
        // Regional variants are the same keyboard as their base language.
        XCTAssertEqual(TypeKeyboardLayout.familiarArrangement(forLanguageCode: "de-AT"), .qwertz)
    }

    // MARK: - Alphabets (Req 11)

    /// Req 11: a language with letters beyond A–Z has them, and has them where its own
    /// keyboard puts them.
    func testAlphabetsCarryTheirOwnLetters() {
        XCTAssertTrue(KeyboardAlphabet.alphabet(forLanguageCode: "de").letters.contains("ß"))
        XCTAssertTrue(KeyboardAlphabet.alphabet(forLanguageCode: "fr").letters.contains("é"))
        XCTAssertTrue(KeyboardAlphabet.alphabet(forLanguageCode: "es").letters.contains("ñ"))
        XCTAssertTrue(KeyboardAlphabet.alphabet(forLanguageCode: "mt").letters.contains("ħ"))
        XCTAssertEqual(KeyboardAlphabet.alphabet(forLanguageCode: "de").familiarRows?.first,
                       "qwertzuiopü")
        XCTAssertEqual(KeyboardAlphabet.alphabet(forLanguageCode: "fr").familiarRows?.first,
                       "azertyuiopéè")
    }

    /// Req 11: a language Tiko has no alphabet for still gets a full Latin keyboard —
    /// which is exactly what every language got before per-language alphabets existed.
    func testUnknownLanguageGetsTheLatinKeyboard() {
        let alphabet = KeyboardAlphabet.alphabet(forLanguageCode: "ja")
        XCTAssertEqual(alphabet.letters, "abcdefghijklmnopqrstuvwxyz")
        XCTAssertEqual(alphabet.familiarRows, ["qwertyuiop", "asdfghjkl", "zxcvbnm"])
    }

    /// Req 11: there is no such thing as Spanish AZERTY, but a Spanish speaker who picks
    /// it must still be able to type ñ — so the letter is carried onto the canonical rows.
    func testCanonicalRowsCarryALanguagesExtraLetters() {
        let spanish = KeyboardAlphabet.alphabet(forLanguageCode: "es")
        let rows = KeyboardAlphabet.rows(for: .azerty, languageCode: "es", alphabet: spanish)
        XCTAssertNotNil(rows)
        XCTAssertTrue(rows?.joined().contains("ñ") == true)
        // …and it is AZERTY, not Spanish QWERTY: asking for an arrangement that is not
        // your own gets you that arrangement.
        XCTAssertTrue(rows?.first?.hasPrefix("azerty") == true)
    }

    /// Req 11: a language keeps its own rows when the named arrangement *is* its own —
    /// German QWERTZ has ü, ö and ä where a German keyboard puts them.
    func testALanguageKeepsItsOwnRowsForItsOwnArrangement() {
        let german = KeyboardAlphabet.alphabet(forLanguageCode: "de")
        XCTAssertEqual(
            KeyboardAlphabet.rows(for: .qwertz, languageCode: "de", alphabet: german),
            ["qwertzuiopü", "asdfghjklöä", "yxcvbnmß"]
        )
    }

    /// Req 11: a Latin arrangement is not a keyboard for Armenian, so there is nothing to
    /// adapt and the caller falls back to the grid.
    func testAnotherScriptsArrangementIsRefused() {
        let armenian = KeyboardAlphabet.alphabet(forLanguageCode: "hy")
        XCTAssertNil(KeyboardAlphabet.rows(for: .qwerty, languageCode: "hy", alphabet: armenian))
        let english = KeyboardAlphabet.alphabet(forLanguageCode: "en")
        XCTAssertNil(KeyboardAlphabet.rows(for: .jcuken, languageCode: "en", alphabet: english))
    }

    // MARK: - A keyboard is a rectangle (Req 9, 11)

    /// The one rule the arrangement engine has: every row of one keyboard is exactly as
    /// wide as every other, insets included. A row that does not add up is a row that
    /// trails off the edge — and this is what stands in for looking at a screenshot of
    /// every arrangement in every language on both screen sizes.
    func testEveryArrangementIsARectangle() {
        forEveryArrangement { name, definition in
            guard let first = definition.rows.first else {
                return XCTFail("\(name) produced no rows")
            }
            XCTAssertEqual(definition.totalUnits, first.totalUnits, accuracy: columnTolerance,
                           "\(name): the panel width is not its first row")
            for row in definition.rows {
                XCTAssertEqual(row.totalUnits, first.totalUnits, accuracy: columnTolerance,
                               "\(name): row \(row.id) is \(row.totalUnits) wide, not \(first.totalUnits)")
            }
        }
    }

    /// Every letter of the language's alphabet is on the keyboard, exactly once.
    func testEveryArrangementCarriesItsWholeAlphabet() {
        for code in languages {
            let letters = Set(KeyboardAlphabet.alphabet(forLanguageCode: code).letters.map(String.init))
            for layout in KeyboardLayouts.all {
                for compact in [true, false] {
                    let definition = KeyboardLayoutDefinition.definition(
                        for: layout, languageCode: code, keySize: .standard, isCompactWidth: compact
                    )
                    let typed = definition.rows
                        .flatMap(\.keys)
                        .compactMap { key -> String? in
                            if case .insert(let fragment) = key.action { return fragment }
                            return nil
                        }
                    let name = "\(code)/\(layout.id)/\(compact ? "phone" : "pad")"
                    XCTAssertTrue(letters.isSubset(of: Set(typed)),
                                  "\(name) is missing \(letters.subtracting(Set(typed)).sorted())")
                    let letterKeys = typed.filter { letters.contains($0) }
                    XCTAssertEqual(Set(letterKeys).count, letterKeys.count,
                                   "\(name) has the same letter on two keys")
                }
            }
        }
    }

    /// Digits are reachable from every arrangement on every screen size: either they are
    /// on the keyboard (the iPad's numeral row) or the `123` key is.
    func testEveryArrangementReachesDigits() {
        forEveryArrangement(showingNumbers: false) { name, definition in
            let ids = Set(definition.rows.flatMap(\.keys).map(\.id))
            let hasNumeralRow = Set("1234567890".map { "key-\($0)" }).isSubset(of: ids)
            XCTAssertTrue(hasNumeralRow || ids.contains("key-symbols-toggle"),
                          "\(name) has no way to type a digit")
        }
    }

    /// A key's identifier has to be unique in its row or the grid cannot tell two keys
    /// apart — and neither can a UI test.
    func testKeyIdentifiersAreUniqueWithinARow() {
        forEveryArrangement { name, definition in
            for row in definition.rows {
                let ids = row.keys.map(\.id)
                XCTAssertEqual(Set(ids).count, ids.count, "\(name): row \(row.id) repeats a key id")
            }
        }
    }

    /// A phone is about ten columns wide. Nothing may quietly grow past the point where a
    /// key stops being hittable — the arrangements that need more room are the ones that
    /// move their punctuation behind `123`.
    func testPhoneArrangementsStayNarrow() {
        for code in languages {
            for layout in KeyboardLayouts.all {
                let definition = KeyboardLayoutDefinition.definition(
                    for: layout, languageCode: code, keySize: .standard, isCompactWidth: true
                )
                XCTAssertLessThanOrEqual(
                    definition.totalUnits, 13.5,
                    "\(code)/\(layout.id) is \(definition.totalUnits) columns wide on a phone"
                )
            }
        }
    }

    /// The staggered arrangements are staggered: the home row sits half a key in from the
    /// row above it, which is the offset a typist reads as "this is QWERTY".
    func testStaggeredArrangementsAreOffset() {
        let definition = KeyboardLayoutDefinition.definition(
            for: .qwerty, languageCode: "en", keySize: .standard, isCompactWidth: true
        )
        // Row 0 is the top letter row on a phone (no numeral row), row 1 the home row.
        XCTAssertEqual(definition.rows[0].leadingUnits, 0, accuracy: columnTolerance)
        XCTAssertEqual(definition.rows[1].leadingUnits, 0.5, accuracy: columnTolerance)
        // Shift on the left of the bottom letter row, backspace on the right.
        XCTAssertEqual(definition.rows[2].keys.first?.id, "key-shift")
        XCTAssertEqual(definition.rows[2].keys.last?.id, "key-backspace")
    }

    /// An iPad has room for the digits above the letters; a phone does not, and puts them
    /// behind `123` instead.
    func testNumeralRowOnlyOnTheWiderScreen() {
        let pad = KeyboardLayoutDefinition.definition(
            for: .qwerty, languageCode: "en", keySize: .standard, isCompactWidth: false
        )
        XCTAssertEqual(pad.rows.first?.keys.map(\.title).joined(), "1234567890")

        let phone = KeyboardLayoutDefinition.definition(
            for: .qwerty, languageCode: "en", keySize: .standard, isCompactWidth: true
        )
        XCTAssertNotEqual(phone.rows.first?.keys.map(\.title).joined(), "1234567890")
        XCTAssertTrue(phone.rows.flatMap(\.keys).contains { $0.id == "key-symbols-toggle" })
    }

    /// The numbers page is exactly as wide as the letters it replaces, so no key moves
    /// under a thumb that was already reaching for it.
    func testNumbersPageIsAsWideAsTheLetters() {
        let letters = KeyboardLayoutDefinition.definition(
            for: .qwerty, languageCode: "en", keySize: .standard, isCompactWidth: true
        )
        let numbers = KeyboardLayoutDefinition.definition(
            for: .qwerty, languageCode: "en", keySize: .standard,
            isCompactWidth: true, showingNumbers: true
        )
        XCTAssertEqual(numbers.totalUnits, letters.totalUnits, accuracy: columnTolerance)
        XCTAssertTrue(numbers.rows.flatMap(\.keys).contains { $0.id == "key-symbols-toggle" },
                      "there is no way back to the letters")
    }

    // MARK: - Key sizes (Req 15)

    /// Req 15: four key sizes, standard by default, and a larger preset really does draw a
    /// taller key.
    func testKeySizesGrowTheKeys() {
        XCTAssertEqual(TypeKeySize.allCases.map(\.id),
                       ["small", "standard", "large", "extraLarge"])
        var previous = 0.0
        for size in TypeKeySize.allCases {
            let definition = KeyboardLayoutDefinition.definition(
                for: .qwerty, languageCode: "en", keySize: size
            )
            XCTAssertGreaterThan(definition.keyHeight, previous,
                                 "\(size.id) is not taller than the size below it")
            XCTAssertGreaterThanOrEqual(definition.keyHeight, Double(KeyGeometry.minimumHittableSide),
                                        "\(size.id) is under the touch target floor")
            previous = definition.keyHeight
        }
    }

    /// Large keys means fewer keys per row, not just bigger ones.
    func testLargeKeysAreFewerPerRow() {
        let large = KeyboardLayoutDefinition.definition(
            for: .large, languageCode: "en", keySize: .standard
        )
        let abc = KeyboardLayoutDefinition.definition(
            for: .abc, languageCode: "en", keySize: .standard
        )
        XCTAssertEqual(large.totalUnits, Double(KeyboardLayoutDefinition.largeKeyColumns))
        XCTAssertEqual(abc.totalUnits, Double(KeyboardLayoutDefinition.alphabeticalColumns))
        XCTAssertGreaterThan(large.keyHeight, abc.keyHeight)
    }

    // MARK: - Geometry (Req 9)

    /// Spare columns go where the alignment says, and the row always comes back exactly
    /// the width it was asked for.
    func testRowSpendsItsSlackWhereAlignmentSays() {
        let keys = [Key.letter("a"), Key.letter("b")]
        let centred = KeyGeometry.row(id: 0, keys: keys, columns: 6, alignment: .centred)
        XCTAssertEqual(centred.leadingUnits, 2)
        XCTAssertEqual(centred.trailingUnits, 2)
        XCTAssertEqual(centred.totalUnits, 6)

        let leading = KeyGeometry.row(id: 0, keys: keys, columns: 6, alignment: .leading)
        XCTAssertEqual(leading.leadingUnits, 4)
        XCTAssertEqual(leading.trailingUnits, 0)
        XCTAssertEqual(leading.totalUnits, 6)
    }

    /// The naive split leaves the tail row nearly empty; the balanced one never leaves a
    /// row more than one key shorter than the longest.
    func testBalancedSplitEvensTheRows() {
        let rows = KeyGeometry.balanced(Array(1...26), maxPerRow: 8)
        XCTAssertEqual(rows.map(\.count), [7, 7, 6, 6])
        XCTAssertEqual(rows.flatMap { $0 }, Array(1...26), "the order is never disturbed")
        XCTAssertEqual(KeyGeometry.balanced([Int](), maxPerRow: 8).count, 0)
    }

    /// A width that cannot be divided produces no column at all rather than a hairline
    /// one — a keyboard that is not there yet, never one that looks broken.
    func testUnitWidthIsZeroWhenThereIsNothingToDivide() {
        XCTAssertEqual(KeyRowLayout.unitWidth(available: 0, columns: 10, spacing: 7), 0)
        XCTAssertEqual(KeyRowLayout.unitWidth(available: 100, columns: 0, spacing: 7), 0)
        XCTAssertEqual(KeyRowLayout.unitWidth(available: 10, columns: 10, spacing: 7), 0,
                       "never negative")
        // 397pt across ten columns with nine 7pt gaps: (397 - 63) / 10.
        XCTAssertEqual(KeyRowLayout.unitWidth(available: 397, columns: 10, spacing: 7), 33.4,
                       accuracy: 0.001)
    }

    /// A key never comes back shorter than the platform touch floor, whatever it is given.
    func testKeysNeverFallBelowTheTouchFloor() {
        for sizing in [KeyGridSizing.panel(tunedHeight: 58), .board(budget: 10)] {
            for unit in [CGFloat(0.5), 4, 30, 200] {
                XCTAssertGreaterThanOrEqual(sizing.height(forUnit: unit),
                                            KeyGeometry.minimumHittableSide)
            }
        }
    }

    // MARK: - The letterboard (Req 29 … 34)

    /// Req 29: the board is the paper object — five letters across with a rail down the
    /// right, not a keyboard arrangement.
    func testLetterboardIsFiveAcrossWithARail() {
        let board = LetterboardBoard.board(letters: "abcdefghijklmnopqrstuvwxyz",
                                           keySize: .standard)
        XCTAssertEqual(board.columns, 6, "five letters and the rail")
        XCTAssertEqual(board.rows[0].keys.prefix(5).map(\.title), ["A", "B", "C", "D", "E"])
        // Backspace at the top of the rail, then the three marks a spelled message needs.
        XCTAssertEqual(board.rows[0].keys.last?.id, "key-backspace")
        XCTAssertEqual(board.rows[1].keys.last?.title, "!")
        XCTAssertEqual(board.rows[2].keys.last?.title, "?")
        XCTAssertEqual(board.rows[3].keys.last?.title, ".")
        // The last letter row takes the rail's column rather than stranding Z alone.
        XCTAssertEqual(board.rows[4].keys.map(\.title), ["U", "V", "W", "X", "Y", "Z"])
    }

    /// Req 30: DONE runs across the foot of the board — the one key that is not a letter,
    /// and the one somebody reaches for while looking away.
    func testLetterboardEndsInDone() {
        let board = LetterboardBoard.board(letters: "abcdefghijklmnopqrstuvwxyz",
                                           keySize: .standard)
        let last = board.rows.last
        XCTAssertEqual(last?.keys.count, 1)
        XCTAssertEqual(last?.keys.first?.id, "key-done")
        XCTAssertEqual(last?.keys.first?.action, .finish)
        XCTAssertEqual(last?.keys.first?.style, .primary)
        XCTAssertEqual(last?.keys.first?.widthUnits, board.columns, "DONE is the whole width")
    }

    /// Req 31: the board is a rectangle too, in every language and on both pages, and it
    /// carries the whole alphabet — a letter missing from a letterboard is a word its
    /// speller cannot spell.
    func testLetterboardIsARectangleAndCarriesEveryAlphabet() {
        for code in languages {
            let letters = KeyboardAlphabet.alphabet(forLanguageCode: code).letters
            for showingNumbers in [false, true] {
                let board = LetterboardBoard.board(
                    letters: letters, showingNumbers: showingNumbers, keySize: .standard
                )
                for row in board.rows {
                    XCTAssertEqual(row.totalUnits, board.columns, accuracy: columnTolerance,
                                   "\(code): letterboard row \(row.id) does not add up")
                    let ids = row.keys.map(\.id)
                    XCTAssertEqual(Set(ids).count, ids.count,
                                   "\(code): letterboard row \(row.id) repeats a key id")
                }
                guard !showingNumbers else { continue }
                let onBoard = Set(board.rows.flatMap(\.keys).compactMap { key -> String? in
                    if case .insert(let fragment) = key.action { return fragment }
                    return nil
                })
                XCTAssertTrue(Set(letters.map(String.init)).isSubset(of: onBoard),
                              "\(code): the letterboard is missing letters")
            }
        }
    }

    /// Req 32: a longer alphabet grows the board rather than shrinking its letters — the
    /// rail runs out and the extra rows are letters.
    func testALongerAlphabetTakesMoreRows() {
        let latin = LetterboardBoard.board(letters: "abcdefghijklmnopqrstuvwxyz",
                                           keySize: .standard)
        let armenian = LetterboardBoard.board(
            letters: KeyboardAlphabet.alphabet(forLanguageCode: "hy").letters, keySize: .standard
        )
        XCTAssertGreaterThan(armenian.rows.count, latin.rows.count)
        XCTAssertEqual(armenian.columns, latin.columns, "still five across and a rail")
    }

    /// Req 33: the board's letters are drawn far larger than a keyboard's — it is meant to
    /// be read from the other side of a bed.
    func testTheBoardShoutsLouderThanTheKeyboard() {
        let board = LetterboardBoard.board(letters: "abcdefghijklmnopqrstuvwxyz",
                                           keySize: .standard)
        let keyboard = KeyboardLayoutDefinition.definition(
            for: .qwerty, languageCode: "en", keySize: .standard
        )
        XCTAssertGreaterThan(board.titlePointSize, keyboard.titlePointSize * 2)
    }

    /// Req 31: the numbers page keeps the board's shape, so nothing a hand already knows
    /// moves.
    func testLetterboardNumbersPageKeepsTheShape() {
        let letters = LetterboardBoard.board(letters: "abcdefghijklmnopqrstuvwxyz",
                                             keySize: .standard)
        let numbers = LetterboardBoard.board(letters: "abcdefghijklmnopqrstuvwxyz",
                                             showingNumbers: true, keySize: .standard)
        XCTAssertEqual(numbers.columns, letters.columns)
        let titles = numbers.rows.flatMap(\.keys).map(\.title)
        for digit in "1234567890".map(String.init) {
            XCTAssertTrue(titles.contains(digit), "the numbers page is missing \(digit)")
        }
    }

    // MARK: - Key identifiers the UI tests depend on

    /// The identifiers are the contract between the keyboard and the UI tests. They are
    /// independent of capitalisation and of which arrangement is on screen.
    func testKeyIdentifiersAreStable() {
        XCTAssertEqual(Key.letter("H").id, "key-h")
        XCTAssertEqual(Key.letter("h").id, "key-h")
        XCTAssertEqual(Key.letter("h").title, "H", "a key is labelled with its capital")
        XCTAssertEqual(Key.spaceBar(widthUnits: 5).id, "key-space")
        XCTAssertEqual(Key.backspace(widthUnits: 1.5).id, "key-backspace")
        XCTAssertEqual(Key.numbers(showingNumbers: false).id, "key-symbols-toggle")
        XCTAssertEqual(Key.numbers(showingNumbers: true).title, "ABC")
        XCTAssertEqual(Key.numbers(showingNumbers: false).title, "123")
    }

    /// A letter key types the small letter it shows the capital of; shift is the only
    /// thing that puts a capital into a message.
    func testALetterKeyTypesTheSmallLetter() {
        XCTAssertEqual(Key.letter("H").action, .insert("h"))
        XCTAssertEqual(Key.spaceBar(widthUnits: 5).action, .word)
        XCTAssertEqual(Key.shift(isOn: false, widthUnits: 1.5).action, .shift)
    }

    /// A gap is not a key: nothing is drawn and nothing can be pressed.
    func testAGapDoesNothing() {
        XCTAssertEqual(Key.gap("x").action, .gap)
        XCTAssertEqual(Key.gap("x").accessibilityLabel, "")
    }

    /// Every key carries an accessibility label. An unlabelled key is silent under
    /// VoiceOver, and a keyboard is traversed key by key.
    func testEveryPressableKeyIsLabelled() {
        forEveryArrangement { name, definition in
            for key in definition.rows.flatMap(\.keys) where key.action != .gap {
                XCTAssertFalse(key.accessibilityLabel.isEmpty,
                               "\(name): \(key.id) has no accessibility label")
            }
        }
    }

    // MARK: - Key themes (Req 13, 14)

    /// Req 13: all six key themes are offered, Classic first.
    func testThemeCatalog() {
        XCTAssertEqual(Set(KeyTheme.allCases.map(\.rawValue)),
                       ["classic", "warm", "cool", "colorful", "contrast", "ghost"])
        XCTAssertEqual(KeyTheme.allCases.first, .classic)
    }

    /// Req 14: looking a theme up by its stored raw value returns that theme; an unknown
    /// value falls back to Classic (as the view does).
    func testThemeLookupByRawValue() {
        XCTAssertEqual(KeyTheme(rawValue: "colorful"), .colorful)
        XCTAssertEqual(KeyTheme(rawValue: "ghost")?.label, "Ghost")
        XCTAssertEqual(KeyTheme(rawValue: "not-a-theme") ?? .classic, .classic)
    }

    /// Req 13/14: every theme answers for every role the grid can ask about, in both
    /// schemes — a keyboard may never be handed a colour a theme forgot to name.
    func testEveryThemeResolvesEveryRoleInBothSchemes() {
        for theme in KeyTheme.allCases {
            for scheme in [ColorScheme.light, .dark] {
                let colors = theme.colors(in: scheme)
                for index in 0..<20 { _ = colors.key("a", index) }
                _ = (colors.keyText, colors.special, colors.specialText)
                _ = (colors.primary, colors.primaryText, colors.active)
                XCTAssertFalse(theme.label.isEmpty)
            }
        }
        // Only Ghost needs the space bar outlined, because only Ghost paints it clear.
        XCTAssertTrue(KeyTheme.ghost.colors(in: .light).outlinesWideKeys)
        for theme in KeyTheme.allCases where theme != .ghost {
            XCTAssertFalse(theme.colors(in: .light).outlinesWideKeys)
        }
    }

    // MARK: - App identity

    /// The Type app palette resolves and is labelled "Type".
    func testAppColorsExist() {
        XCTAssertEqual(TikoAppColor.type.palette.label, "Type")
    }

    // MARK: - Helpers

    /// Runs `check` over every arrangement, in every language, on both screen sizes and on
    /// both the letters and the numbers page.
    private func forEveryArrangement(
        showingNumbers: Bool? = nil,
        _ check: (String, KeyboardLayoutDefinition) -> Void
    ) {
        let pages = showingNumbers.map { [$0] } ?? [false, true]
        for code in languages {
            for layout in KeyboardLayouts.all {
                for compact in [true, false] {
                    for numbers in pages {
                        let definition = KeyboardLayoutDefinition.definition(
                            for: layout,
                            languageCode: code,
                            keySize: .standard,
                            isCompactWidth: compact,
                            showingNumbers: numbers
                        )
                        let name = "\(code)/\(layout.id)/\(compact ? "phone" : "pad")"
                            + (numbers ? "/123" : "")
                        check(name, definition)
                    }
                }
            }
        }
    }
}
