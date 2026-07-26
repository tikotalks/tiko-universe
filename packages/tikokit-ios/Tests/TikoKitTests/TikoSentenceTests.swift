import XCTest
@testable import TikoKit

/// The realizer runs on the device, so these are the tests that prove the bundle
/// loaded and the grammar is the real one — not a Swift approximation of it.
final class TikoSentenceTests: XCTestCase {
    func testBundleLoads() {
        let codes = TikoSentenceBuilder.shared.supportedLanguages()
        XCTAssertGreaterThan(codes.count, 50, "the realizer bundle did not load")
        XCTAssertTrue(codes.contains("nl"))
        XCTAssertTrue(codes.contains("hi"))
    }

    func testEnglishArticle() {
        let words = [
            TikoSentenceWord(id: "i", text: "I", pos: "pronoun", category: "people"),
            TikoSentenceWord(id: "want", text: "want", pos: "verb", category: "actions"),
            TikoSentenceWord(id: "apple", text: "apple", pos: "noun", category: "food"),
        ]
        let sentence = TikoSentenceBuilder.shared.sentence(for: words, locale: "en")
        XCTAssertEqual(sentence.text, "I want an apple.")
        // The strip a child is still building carries no full stop.
        XCTAssertEqual(sentence.strip, "I want an apple")
    }

    func testDutchOnDevice() {
        let words = [
            TikoSentenceWord(id: "i", text: "ik", pos: "pronoun", category: "people"),
            TikoSentenceWord(id: "want", text: "willen", pos: "verb", category: "actions"),
            TikoSentenceWord(id: "apple", text: "appel", pos: "noun", category: "food"),
        ]
        let sentence = TikoSentenceBuilder.shared.sentence(for: words, locale: "nl")
        XCTAssertEqual(sentence.text, "Ik wil een appel.")
    }

    func testCustomWordIsAName() {
        let words = [
            TikoSentenceWord(id: "i", text: "I", pos: "pronoun", category: "people"),
            TikoSentenceWord(id: "want", text: "want", pos: "verb", category: "actions"),
            TikoSentenceWord(id: "custom-1", text: "Sil", pos: "noun", category: "people"),
        ]
        let plain = TikoSentenceBuilder.shared.sentence(for: words, locale: "en")
        XCTAssertEqual(plain.text, "I want a Sil.", "without the hint it is treated as a common noun")

        let named = TikoSentenceBuilder.shared.sentence(for: words, locale: "en", customWordIds: ["custom-1"])
        XCTAssertEqual(named.text, "I want Sil.")
    }

    func testHindiWarnsAboutSpeakerGender() {
        let words = [
            TikoSentenceWord(id: "i", text: "मैं", pos: "pronoun", category: "people"),
            TikoSentenceWord(id: "want", text: "चाह", pos: "verb", category: "actions"),
            TikoSentenceWord(id: "apple", text: "सेब", pos: "noun", category: "food"),
        ]
        let assumed = TikoSentenceBuilder.shared.sentence(for: words, locale: "hi")
        XCTAssertEqual(assumed.text, "मैं सेब चाहता हूँ।")
        XCTAssertTrue(
            assumed.notes.contains { $0.contains("wrong for a girl") },
            "the app should be able to see that the speaker's gender was assumed"
        )

        let girl = TikoSentenceBuilder.shared.sentence(for: words, locale: "hi", speakerGender: "feminine")
        XCTAssertEqual(girl.text, "मैं सेब चाहती हूँ।")
    }

    func testPacksShipWithTheApp() throws {
        let builder = TikoSentenceBuilder.shared
        XCTAssertTrue(builder.hasPack(for: "nl"))
        XCTAssertTrue(builder.hasPack(for: "nl-BE"), "a region should resolve to its language")
        XCTAssertFalse(builder.hasPack(for: "kl"))

        let pack = try builder.pack(for: "nl")
        XCTAssertEqual(pack.locale, "nl")
        XCTAssertEqual(pack.words.count, 348)
    }

    func testEveryOfferedLanguageHasAPack() {
        // The picker offers these; a child who chooses one must get a board.
        for language in TikoLanguage.allLanguages {
            XCTAssertTrue(
                TikoSentenceBuilder.shared.hasPack(for: language.id),
                "no bundled pack for \(language.title) (\(language.id))"
            )
        }
    }
}
