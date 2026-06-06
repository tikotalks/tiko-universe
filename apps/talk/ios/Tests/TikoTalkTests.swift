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
        """#.data(using: .utf8)!

        let decoded = try JSONDecoder().decode(TalkSentenceStartResponse.self, from: json)

        XCTAssertEqual(decoded.templates.first?.pattern, "I want ___")
        XCTAssertEqual(decoded.initialWords.first?.text, "I")
        XCTAssertEqual(decoded.stripState.words, [])
        XCTAssertFalse(decoded.stripState.canComplete)
    }

    func testDecodesVocabularyAndPhrasesResponses() throws {
        let vocabularyJSON = #"""
        {
          "words": [{"id":"juice","text":"juice","pos":"noun","category":"drinks","icon":"drop.fill"}],
          "categories": [{"id":"drinks","label":"Drinks","icon":"drop.fill","posTypes":["noun"],"wordCount":1}],
          "totalWords": 1
        }
        """#.data(using: .utf8)!
        let phrasesJSON = #"""
        {
          "phrases": [{"id":"p1","sentence":"I want juice","wordIds":["i","want","juice"],"isAuto":false,"usageCount":2,"label":"Juice"}]
        }
        """#.data(using: .utf8)!

        let vocabulary = try JSONDecoder().decode(TalkSentenceVocabularyResponse.self, from: vocabularyJSON)
        let phrases = try JSONDecoder().decode(TalkSentencePhrasesResponse.self, from: phrasesJSON)

        XCTAssertEqual(vocabulary.totalWords, 1)
        XCTAssertEqual(vocabulary.words.first?.id, "juice")
        XCTAssertEqual(phrases.phrases.first?.wordIds, ["i", "want", "juice"])
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
        let store = TalkStore(apiClient: FakeTalkAPIClient())
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
        let store = TalkStore(apiClient: FakeTalkAPIClient())
        store.isOfflineFallback = true
        await store.addWord(TalkWordTile(id: "more", text: "more", pos: "modifier", category: "extras"))

        store.clearSentence()

        XCTAssertTrue(store.sentenceWords.isEmpty)
        XCTAssertNil(store.completedSentence)
        XCTAssertNil(store.audioURL)
    }

    func testStoreAppliesCategoryFilteringFromVocabulary() async {
        let api = FakeTalkAPIClient()
        let store = TalkStore(apiClient: api, identityProvider: FakeTalkIdentityProvider())

        await store.load()
        store.selectCategory(id: "drinks")

        XCTAssertEqual(store.selectedCategoryId, "drinks")
        XCTAssertEqual(store.filteredWords.map(\.id), ["juice"])
        XCTAssertEqual(store.categories.map(\.id), ["pronouns", "drinks"])
    }

    func testStoreRefreshesSuggestionsAndCompletionStateAfterAddingWord() async {
        let api = FakeTalkAPIClient()
        let store = TalkStore(apiClient: api, identityProvider: FakeTalkIdentityProvider())

        await store.load()
        await store.addWord(TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"))

        XCTAssertEqual(store.suggestions.map(\.id), ["want"])
        XCTAssertEqual(store.stripDisplay, "I ___")
        XCTAssertFalse(store.canSpeak)
    }

    func testStoreSupportsReorderWithoutChangingWords() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient())
        store.isOfflineFallback = true
        await store.addWord(TalkWordTile(id: "want", text: "want", pos: "verb", category: "actions"))
        await store.addWord(TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"))

        await store.moveWord(from: 1, to: 0)

        XCTAssertEqual(store.sentenceWords.map(\.id), ["i", "want"])
    }

    func testStorePrefillsTemplateKnownWordsAndLeavesSlotOpen() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient(), identityProvider: FakeTalkIdentityProvider())
        await store.load()

        await store.applyTemplate(TalkTemplate(id: "want", pattern: "I want ___", category: "needs", icon: nil, slotCount: 1))

        XCTAssertEqual(store.sentenceWords.map(\.id), ["i", "want"])
        XCTAssertEqual(store.stripDisplay, "I want ___")
    }

    func testStoreSavesAndDeletesPhrasesThroughAPI() async {
        let api = FakeTalkAPIClient()
        let store = TalkStore(apiClient: api, identityProvider: FakeTalkIdentityProvider())
        await store.load()
        await store.addWord(TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"))
        await store.addWord(TalkWordTile(id: "want", text: "want", pos: "verb", category: "actions"))

        let saved = await store.saveCurrentPhrase(label: "I want")
        await store.deletePhrase(id: "saved-api")

        XCTAssertEqual(saved?.id, "saved-api")
        XCTAssertTrue(api.didSavePhrase)
        XCTAssertTrue(api.deletedPhraseIds.contains("saved-api"))
        XCTAssertFalse(store.savedPhrases.contains { $0.id == "saved-api" })
    }

    func testStoreBootstrapsIdentityBeforeLoadingSentenceData() async {
        let identity = FakeTalkIdentityProvider()
        let store = TalkStore(apiClient: FakeTalkAPIClient(), identityProvider: identity)

        await store.load()

        XCTAssertTrue(identity.didBootstrap)
        XCTAssertEqual(store.userId, "subject-1")
        XCTAssertEqual(store.sessionToken, "token-1")
    }
}

private final class FakeTalkIdentityProvider: TalkIdentityProviding, @unchecked Sendable {
    var didBootstrap = false

    func bootstrapIdentity() async throws -> TalkIdentityContext {
        didBootstrap = true
        return TalkIdentityContext(userId: "subject-1", sessionToken: "token-1")
    }
}

private final class FakeTalkAPIClient: TalkSentenceAPI, @unchecked Sendable {
    var didSavePhrase = false
    var deletedPhraseIds: [String] = []

    func start(locale: String, userId: String?, sessionToken: String?) async throws -> TalkSentenceStartResponse {
        TalkSentenceStartResponse(
            templates: [TalkTemplate(id: "want", pattern: "I want ___", category: "needs", icon: nil, slotCount: 1)],
            initialCategories: [TalkCategory(id: "pronouns", label: "Pronouns", icon: nil, posTypes: ["pronoun"], wordCount: 1)],
            initialWords: [TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns")],
            savedPhrases: [],
            stripState: TalkStripState(words: [], validNext: ["pronoun"], canComplete: false)
        )
    }

    func next(currentWords: [String], locale: String, userId: String?, sessionToken: String?) async throws -> TalkSentenceNextResponse {
        TalkSentenceNextResponse(
            suggestions: [TalkWordTile(id: "want", text: "want", pos: "verb", category: "actions")],
            categories: [
                TalkCategory(id: "pronouns", label: "Pronouns", icon: nil, posTypes: ["pronoun"], wordCount: 1),
                TalkCategory(id: "drinks", label: "Drinks", icon: nil, posTypes: ["noun"], wordCount: 1)
            ],
            words: [
                "pronouns": [TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns")],
                "drinks": [TalkWordTile(id: "juice", text: "juice", pos: "noun", category: "drinks")]
            ],
            stripState: TalkStripState(display: "I ___", validNext: ["verb"], canComplete: false)
        )
    }

    func complete(wordIds: [String], locale: String, autoSave: Bool, userId: String?, sessionToken: String?) async throws -> TalkSentenceCompleteResponse {
        TalkSentenceCompleteResponse(sentence: "I want.", audioUrl: "https://example.com/i-want.mp3", audioCached: true, savedPhraseId: nil, templateMatch: nil)
    }

    func vocabulary(locale: String, category: String?, pos: String?, sessionToken: String?) async throws -> TalkSentenceVocabularyResponse {
        TalkSentenceVocabularyResponse(
            words: [TalkWordTile(id: "juice", text: "juice", pos: "noun", category: "drinks")],
            categories: [TalkCategory(id: "drinks", label: "Drinks", icon: nil, posTypes: ["noun"], wordCount: 1)],
            totalWords: 1
        )
    }

    func phrases(locale: String, userId: String, sessionToken: String?) async throws -> TalkSentencePhrasesResponse {
        TalkSentencePhrasesResponse(phrases: [])
    }

    func savePhrase(locale: String, userId: String, wordIds: [String], label: String?, sessionToken: String?) async throws -> TalkSaveSentencePhraseResponse {
        didSavePhrase = true
        return TalkSaveSentencePhraseResponse(phrase: TalkSavedPhrase(id: "saved-api", sentence: "I want", wordIds: wordIds, isAuto: false, usageCount: 1, label: label))
    }

    func deletePhrase(phraseId: String, locale: String, userId: String, sessionToken: String?) async throws -> TalkDeleteSentencePhraseResponse {
        deletedPhraseIds.append(phraseId)
        return TalkDeleteSentencePhraseResponse(deleted: true)
    }
}
