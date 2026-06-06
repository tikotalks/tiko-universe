import XCTest
@testable import TikoTalk

@MainActor
final class TikoTalkTests: XCTestCase {
    func testTalkAppMetadata() {
        XCTAssertEqual(TalkAppConfig.bundleIdentifier, "mt.tiko.talk")
        XCTAssertEqual(TalkAppConfig.app.id, .talk)
        XCTAssertEqual(TalkAppConfig.app.title, "Talk")
    }

    func testDecodesSentenceStartResponse() throws {
        let json = #"""
        {
          "templates": [{"id":"want","pattern":"I want ___","category":"needs","icon":"bubble.left.fill","slotCount":1}],
          "initialCategories": [{"id":"pronouns","label":"Pronouns","icon":"person.fill","posTypes":["pronoun"],"wordCount":1}],
          "initialWords": [{"id":"i","text":"I","pos":"pronoun","category":"pronouns","icon":"person.fill"}],
          "savedPhrases": [],
          "stripState": {"words": [], "validNext": ["pronoun"], "canComplete": false}
        }
        """.data(using: .utf8)!

        let decoded = try JSONDecoder().decode(TalkSentenceStartResponse.self, from: json)

        XCTAssertEqual(decoded.templates.first?.pattern, "I want ___")
        XCTAssertEqual(decoded.initialWords.first?.text, "I")
        XCTAssertEqual(decoded.stripState.words, [])
        XCTAssertFalse(decoded.stripState.canComplete)
    }

    func testSentenceTextJoinsWords() {
        let words = [
            TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"),
            TalkWordTile(id: "want", text: "want", pos: "verb", category: "actions"),
            TalkWordTile(id: "juice", text: "juice", pos: "noun", category: "things")
        ]

        XCTAssertEqual(words.talkSentenceText, "I want juice")
    }

    func testOfflineFallbackContainsSmallStarterPack() {
        let fallback = TalkOfflineFallback.startResponse

        XCTAssertFalse(fallback.initialWords.isEmpty)
        XCTAssertTrue(fallback.initialWords.contains { $0.id == "i" })
        XCTAssertTrue(fallback.templates.contains { $0.id == "fallback-help" })
        XCTAssertEqual(TalkOfflineFallback.templateWords(for: fallback.templates.first { $0.id == "fallback-help" }!).map(\.id), ["i", "need", "help"])
    }

    func testStoreMutatesSentenceWithoutAPICalls() async {
        let store = TalkStore()
        store.isOfflineFallback = true
        let word = TalkWordTile(id: "help", text: "help", pos: "verb", category: "actions")

        await store.addWord(word)
        XCTAssertEqual(store.sentenceText, "help")
        XCTAssertTrue(store.canSpeak)

        await store.removeWord(id: "help")
        XCTAssertEqual(store.sentenceText, "")
        XCTAssertFalse(store.canSpeak)
    }

    func testClearSentenceResetsCompletionState() async {
        let store = TalkStore()
        store.isOfflineFallback = true
        await store.addWord(TalkWordTile(id: "more", text: "more", pos: "modifier", category: "extras"))

        store.clearSentence()

        XCTAssertTrue(store.sentenceWords.isEmpty)
        XCTAssertNil(store.completedSentence)
        XCTAssertNil(store.audioURL)
    }
}
