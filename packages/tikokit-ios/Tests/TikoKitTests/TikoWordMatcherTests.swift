import XCTest
import TikoKit

final class TikoWordMatcherTests: XCTestCase {
    private let en = TikoWordMatcher(languageCode: "en")
    private let nl = TikoWordMatcher(languageCode: "nl")
    private let fr = TikoWordMatcher(languageCode: "fr")

    // MARK: - Exact matches

    func testExactMatchOnPrimaryTarget() {
        XCTAssertEqual(en.match(transcript: "dog", listenFor: ["dog"]), .exact)
    }

    func testAlternativeMatch() {
        XCTAssertEqual(en.match(transcript: "doggy", listenFor: ["dog", "doggy"]), .alternative)
    }

    // MARK: - Capitalization, punctuation, whitespace

    func testCapitalizationAndPunctuationIgnored() {
        XCTAssertEqual(en.match(transcript: "Dog!", listenFor: ["dog"]), .exact)
        XCTAssertEqual(en.match(transcript: "DOG.", listenFor: ["dog"]), .exact)
    }

    func testWhitespaceCollapsed() {
        XCTAssertEqual(en.match(transcript: "  dog \n ", listenFor: ["dog"]), .exact)
        XCTAssertEqual(en.match(transcript: "a   dog", listenFor: ["dog"]), .approvedPhrase)
    }

    // MARK: - Approved phrases per language

    func testEnglishLeadingArticles() {
        XCTAssertEqual(en.match(transcript: "a dog", listenFor: ["dog"]), .approvedPhrase)
        XCTAssertEqual(en.match(transcript: "an elephant", listenFor: ["elephant"]), .approvedPhrase)
        XCTAssertEqual(en.match(transcript: "the dog", listenFor: ["dog"]), .approvedPhrase)
        XCTAssertEqual(en.match(transcript: "it's a dog", listenFor: ["dog"]), .approvedPhrase)
    }

    func testDutchLeadingArticles() {
        XCTAssertEqual(nl.match(transcript: "de hond", listenFor: ["hond"]), .approvedPhrase)
        XCTAssertEqual(nl.match(transcript: "een hond", listenFor: ["hond"]), .approvedPhrase)
        XCTAssertEqual(nl.match(transcript: "het ei", listenFor: ["ei"]), .approvedPhrase)
    }

    func testFrenchElision() {
        XCTAssertEqual(fr.match(transcript: "l'éléphant", listenFor: ["éléphant"]), .approvedPhrase)
        XCTAssertEqual(fr.match(transcript: "un chien", listenFor: ["chien"]), .approvedPhrase)
    }

    func testForeignArticleWithCorrectWordStillMatches() {
        // The child said the target word ("dog"); a stray foreign article in the
        // transcript does not make that wrong. Whole-word containment accepts it.
        XCTAssertEqual(en.match(transcript: "de dog", listenFor: ["dog"]), .exact)
        // …but a foreign article with the WRONG word is still rejected.
        XCTAssertNil(en.match(transcript: "de kat", listenFor: ["dog"]))
    }

    // MARK: - Empty input

    func testEmptyTranscriptNeverMatches() {
        XCTAssertNil(en.match(transcript: "", listenFor: ["dog"]))
        XCTAssertNil(en.match(transcript: "   ", listenFor: ["dog"]))
    }

    func testEmptyTargetsNeverMatch() {
        XCTAssertNil(en.match(transcript: "dog", listenFor: []))
        XCTAssertNil(en.match(transcript: "dog", listenFor: ["", "  "]))
    }

    // MARK: - Short-word safety (no fuzzy under 4 characters)

    func testShortWordsRejectNearbyWords() {
        // A different short word is never a match under the standard matcher…
        XCTAssertNil(en.match(transcript: "dot", listenFor: ["dog"]))
        XCTAssertNil(en.match(transcript: "hat", listenFor: ["cat"]))
        XCTAssertNil(en.match(transcript: "card", listenFor: ["car"]))
        // …but "bus stop" actually contains the exact target word "bus", so a
        // child who said it has said the word — whole-word containment accepts.
        XCTAssertEqual(en.match(transcript: "bus stop", listenFor: ["bus"]), .exact)
    }

    // MARK: - Whole-word containment (target spoken among extra words)

    func testTargetWordAmongExtraWordsMatches() {
        XCTAssertEqual(en.match(transcript: "dog dog", listenFor: ["dog"]), .exact)
        XCTAssertEqual(en.match(transcript: "i see a dog", listenFor: ["dog"]), .exact)
        XCTAssertEqual(en.match(transcript: "the doggy is big", listenFor: ["dog", "doggy"]), .alternative)
    }

    func testMultiWordTargetSpanMatches() {
        XCTAssertEqual(en.match(transcript: "i want ice cream please", listenFor: ["ice cream"]), .exact)
        // A broken-up span is not the phrase.
        XCTAssertNil(en.match(transcript: "ice and cream", listenFor: ["ice cream"]))
    }

    func testContainmentStillRejectsAbsentWord() {
        XCTAssertNil(en.match(transcript: "big red truck", listenFor: ["dog"]))
    }

    // MARK: - Forgiving tier (late attempts)

    func testForgivingTierAllowsShortWordSingleEdit() {
        let forgiving = TikoWordMatcher(languageCode: "en", config: .forgiving)
        // A single-edit near-miss on a short word is accepted once forgiving…
        XCTAssertEqual(forgiving.match(transcript: "dob", listenFor: ["dog"]), .fuzzy)
        // …while the standard matcher still rejects it.
        XCTAssertNil(en.match(transcript: "dob", listenFor: ["dog"]))
    }

    func testForgivingTierMatchesMispronouncedWordInFiller() {
        let forgiving = TikoWordMatcher(languageCode: "en", config: .forgiving)
        XCTAssertEqual(forgiving.match(transcript: "um wabbit", listenFor: ["rabbit"]), .fuzzy)
    }

    func testForgivingTierStillRejectsDifferentWords() {
        let forgiving = TikoWordMatcher(languageCode: "en", config: .forgiving)
        XCTAssertNil(forgiving.match(transcript: "cat", listenFor: ["dog"]))
        XCTAssertNil(forgiving.match(transcript: "melon", listenFor: ["milk"]))
    }

    // MARK: - Fuzzy boundaries

    func testFourToFiveCharacterWordsAllowOneEdit() {
        // One edit (plural s) is accepted for 4–5 character targets…
        XCTAssertEqual(en.match(transcript: "trains", listenFor: ["train"]), .fuzzy)
        // …but two edits are not, and unrelated words never match.
        XCTAssertNil(en.match(transcript: "trane", listenFor: ["train"]))
        XCTAssertNil(en.match(transcript: "trolley", listenFor: ["train"]))
    }

    func testLongWordSimilarityThreshold() {
        // banana → bannana: distance 1 over 7 chars ≈ 0.857 similarity → accepted.
        XCTAssertEqual(en.match(transcript: "bannana", listenFor: ["banana"]), .fuzzy)
        // Clearly different word stays rejected.
        XCTAssertNil(en.match(transcript: "bandana factory", listenFor: ["banana"]))
    }

    func testFuzzyThresholdIsConfigurable() {
        let strict = TikoWordMatcher(
            languageCode: "en",
            config: TikoWordMatcherConfig(longWordSimilarityThreshold: 0.95)
        )
        XCTAssertNil(strict.match(transcript: "bannana", listenFor: ["banana"]))

        let relaxed = TikoWordMatcher(languageCode: "en", config: .relaxed)
        XCTAssertEqual(relaxed.match(transcript: "elefant", listenFor: ["elephant"]), .fuzzy)
    }

    func testRelaxedConfigDoesNotLoosenShortWords() {
        let relaxed = TikoWordMatcher(languageCode: "en", config: .relaxed)
        XCTAssertNil(relaxed.match(transcript: "dot", listenFor: ["dog"]))
        XCTAssertNil(relaxed.match(transcript: "card", listenFor: ["car"]))
    }

    // MARK: - Locale-specific characters

    func testLocaleSpecificCharacters() {
        XCTAssertEqual(fr.match(transcript: "Œuf", listenFor: ["œuf", "oeuf"]), .exact)
        let mt = TikoWordMatcher(languageCode: "mt")
        XCTAssertEqual(mt.match(transcript: "Ħalib", listenFor: ["ħalib"]), .exact)
        XCTAssertEqual(mt.match(transcript: "il-kelb", listenFor: ["kelb"]), .approvedPhrase)
    }

    // MARK: - Similar incorrect words

    func testSimilarIncorrectWordsRejected() {
        XCTAssertNil(en.match(transcript: "melon", listenFor: ["milk"]))
        XCTAssertNil(en.match(transcript: "plain sight", listenFor: ["plane", "airplane"]))
    }

    // MARK: - Levenshtein

    func testLevenshteinDistance() {
        XCTAssertEqual(TikoWordMatcher.levenshtein("", ""), 0)
        XCTAssertEqual(TikoWordMatcher.levenshtein("cat", ""), 3)
        XCTAssertEqual(TikoWordMatcher.levenshtein("cat", "cat"), 0)
        XCTAssertEqual(TikoWordMatcher.levenshtein("cat", "hat"), 1)
        XCTAssertEqual(TikoWordMatcher.levenshtein("banana", "bannana"), 1)
    }
}
