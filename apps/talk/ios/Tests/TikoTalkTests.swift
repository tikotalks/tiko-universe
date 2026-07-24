import SwiftUI
import XCTest
@testable import TikoTalk

@MainActor
final class TikoTalkTests: XCTestCase {
    func testTalkAppMetadata() {
        XCTAssertEqual(TalkAppConfig.bundleIdentifier, "mt.tiko.talk")
        XCTAssertEqual(TalkAppConfig.app.id, .talk)
        XCTAssertEqual(TalkAppConfig.app.title, "Talk")
    }

    func testTalkAPIClientUsesBuildEnvironmentDefault() {
        #if DEBUG
        XCTAssertEqual(TalkAPIClient.defaultEnvironment, .development)
        #else
        XCTAssertEqual(TalkAPIClient.defaultEnvironment, .production)
        #endif
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

    // MARK: - Offline / no-account usability (Req 1, 6, 14)

    /// Req 1 / 14: the deterministic offline capture seed populates the board with
    /// the built-in starter words and no network — this is what a fresh, offline,
    /// no-account launch (and the UI tests) rely on.
    func testLoadOfflineFallbackForCapturePopulatesBoard() {
        let store = TalkStore(apiClient: FakeTalkAPIClient(), identityProvider: FakeTalkIdentityProvider())

        store.loadOfflineFallbackForCapture()

        XCTAssertTrue(store.isOfflineFallback)
        XCTAssertFalse(store.boardWords.isEmpty)
        XCTAssertTrue(store.boardWords.contains { $0.id == "want" }, "starter board should include the 'want' tile the UI test taps")
        XCTAssertTrue(store.sentenceWords.isEmpty, "no words should be in the sentence before any tap")
    }

    /// Req 6: a custom typed word (not in the language pack) is added to the
    /// sentence, contributes to the spoken text, and keeps the sentence speakable
    /// without calling the sentence API.
    func testCustomTypedWordJoinsSentenceAndStaysSpeakable() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient(), identityProvider: FakeTalkIdentityProvider())
        await store.load()

        await store.addWord(TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"))
        await store.addWord(TalkWordTile(id: "uword-local-\(UUID().uuidString)", text: "Sil", pos: "noun", category: "mine", isCustom: true))

        XCTAssertEqual(store.sentenceText, "I Sil")
        XCTAssertTrue(store.canSpeak, "a locally-typed custom word should still be speakable")
    }

    /// A completed sentence built purely from custom words falls back to on-device
    /// speech (no /complete call, no audio URL) so it works offline.
    func testCompleteSentenceWithCustomWordUsesNativeFallback() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient(), identityProvider: FakeTalkIdentityProvider())
        await store.load()
        await store.addWord(TalkWordTile(id: "uword-local-abc", text: "Mum", pos: "noun", category: "mine", isCustom: true))

        let response = await store.completeSentence()

        XCTAssertNil(response, "custom-word sentences skip the /complete API")
        XCTAssertNil(store.audioURL)
        XCTAssertEqual(store.completedSentence, "Mum")
    }

    // MARK: - Model helpers (Req 5, 6)

    /// Deduplication keeps the first occurrence of each id, preserving order.
    func testDeduplicatedByIdKeepsFirstOccurrenceInOrder() {
        let words = [
            TalkWordTile(id: "a", text: "A", pos: "noun", category: "c"),
            TalkWordTile(id: "b", text: "B", pos: "noun", category: "c"),
            TalkWordTile(id: "a", text: "A2", pos: "noun", category: "c")
        ]

        let deduped = words.deduplicatedById()

        XCTAssertEqual(deduped.map(\.id), ["a", "b"])
        XCTAssertEqual(deduped.first?.text, "A", "the first occurrence is kept")
    }

    /// `matching(ids:)` resolves saved-phrase / template word ids to tiles in the
    /// requested order, dropping ids it doesn't know.
    func testMatchingIdsResolvesInOrderAndDropsUnknown() {
        let resolved = TalkOfflineFallback.words.matching(ids: ["help", "i", "unknown", "want"])

        XCTAssertEqual(resolved.map(\.id), ["help", "i", "want"])
    }

    // MARK: - Part-of-speech colour mapping (sentence-chip / cloud tinting)

    /// Each recognised part of speech maps to a stable, distinct colour so the
    /// sentence chips and cloud borders are visually differentiated.
    func testPosColorIsStableAndDistinctPerPartOfSpeech() {
        let posTypes = [
            "pronoun", "verb", "noun", "adjective", "adverb",
            "determiner", "question", "preposition", "conjunction", "social"
        ]

        // Stable: the same pos always yields the same colour.
        for pos in posTypes {
            XCTAssertEqual(TalkPosColor.color(for: pos), TalkPosColor.color(for: pos), "\(pos) colour should be stable")
        }

        // Distinct: no two recognised parts of speech share a colour.
        let colors = posTypes.map { TalkPosColor.color(for: $0) }
        for i in colors.indices {
            for j in colors.indices where j > i {
                XCTAssertNotEqual(colors[i], colors[j], "\(posTypes[i]) and \(posTypes[j]) should have different colours")
            }
        }
    }

    /// An unrecognised (or empty) part of speech falls back to the single shared
    /// Talk default colour, distinct from every recognised pos colour.
    func testUnknownPartOfSpeechUsesSharedDefaultColor() {
        let fallbackA = TalkPosColor.color(for: "made-up-pos")
        let fallbackB = TalkPosColor.color(for: "")

        XCTAssertEqual(fallbackA, fallbackB, "all unknown pos values share the one fallback colour")
        XCTAssertNotEqual(fallbackA, TalkPosColor.color(for: "pronoun"), "the fallback differs from a real pos colour")
    }

    // MARK: - Offline fallback template + seed data

    /// Every offline template resolves to its exact ready-made word set, and an
    /// unknown template id resolves to nothing (so the store falls through to the
    /// pattern-prefill / slot logic instead).
    func testTemplateWordsForEachOfflineTemplate() {
        func words(_ id: String, pattern: String) -> [String] {
            TalkOfflineFallback.templateWords(for: TalkTemplate(id: id, pattern: pattern, category: "needs", icon: nil, slotCount: 0)).map(\.id)
        }

        XCTAssertEqual(words("fallback-i-want", pattern: "I want ___"), ["i", "want"])
        XCTAssertEqual(words("fallback-help", pattern: "I need help"), ["i", "need", "help"])
        XCTAssertEqual(words("fallback-more", pattern: "More ___ please"), ["more", "please"])
        XCTAssertTrue(words("not-a-template", pattern: "x").isEmpty, "unknown templates resolve to no words")
    }

    /// The deterministic offline start seed exposes the starter categories and a
    /// ready-to-tap saved phrase — the no-network baseline the app degrades to.
    func testOfflineStartResponseSeedsCategoriesAndSavedPhrase() {
        let start = TalkOfflineFallback.startResponse

        XCTAssertEqual(start.initialCategories.map(\.id), ["pronouns", "actions", "extras"])
        XCTAssertEqual(start.stripState.validNext, ["pronoun", "verb", "modifier"])
        XCTAssertFalse(start.stripState.canComplete, "an empty seeded strip cannot complete yet")

        let phrase = start.savedPhrases.first { $0.id == "fallback-help-phrase" }
        XCTAssertEqual(phrase?.wordIds, ["i", "need", "help"])
        XCTAssertEqual(phrase?.sentence, "I need help")
    }

    // MARK: - Store board ordering, phrase recall, clearing, and guards

    /// The board lists ranked next-word suggestions first, then the remaining
    /// vocabulary, with no id appearing twice.
    func testBoardWordsPlacesSuggestionsFirstThenRemainingVocabulary() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient(), identityProvider: FakeTalkIdentityProvider())
        await store.load()
        await store.addWord(TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"))

        // Suggestion "want" comes first; the vocabulary ("i", "juice") follows.
        XCTAssertEqual(store.boardWords.first?.id, "want")
        XCTAssertEqual(store.boardWords.map(\.id), store.boardWords.map(\.id).reduce(into: [String]()) { acc, id in
            if !acc.contains(id) { acc.append(id) }
        }, "board words must not contain duplicate ids")
        XCTAssertTrue(store.boardWords.contains { $0.id == "juice" })
    }

    /// Clearing the sentence restores the board to its baseline vocabulary and
    /// drops any category filter.
    func testClearSentenceRestoresBaselineBoardAndFilter() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient(), identityProvider: FakeTalkIdentityProvider())
        await store.load()
        await store.addWord(TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"))
        store.selectCategory(id: "drinks")

        store.clearSentence()

        XCTAssertTrue(store.sentenceWords.isEmpty)
        XCTAssertTrue(store.suggestions.isEmpty)
        XCTAssertNil(store.selectedCategoryId, "clearing drops the category filter")
        XCTAssertEqual(Set(store.visibleWords.map(\.id)), ["i", "juice"], "board returns to the baseline vocabulary")
    }

    /// Recalling a saved phrase loads its words from the known vocabulary and
    /// leaves the sentence immediately speakable.
    func testSelectPhraseLoadsWordsAndIsSpeakable() {
        let store = TalkStore(apiClient: FakeTalkAPIClient(), identityProvider: FakeTalkIdentityProvider())
        store.loadOfflineFallbackForCapture()

        store.selectPhrase(TalkSavedPhrase(id: "p", sentence: "I want", wordIds: ["i", "want"], isAuto: false, usageCount: 1, label: nil))

        XCTAssertEqual(store.sentenceWords.map(\.id), ["i", "want"])
        XCTAssertEqual(store.completedSentence, "I want")
        XCTAssertTrue(store.canSpeak)
    }

    /// A regular (non-custom) sentence completes through the Sentence API, taking
    /// the returned sentence text and audio URL.
    func testCompleteSentenceThroughAPISetsSentenceAndAudioURL() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient(), identityProvider: FakeTalkIdentityProvider())
        await store.load()
        await store.addWord(TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"))
        await store.addWord(TalkWordTile(id: "want", text: "want", pos: "verb", category: "actions"))

        let response = await store.completeSentence()

        XCTAssertEqual(response?.sentence, "I want.")
        XCTAssertEqual(store.completedSentence, "I want.")
        XCTAssertEqual(store.audioURL, URL(string: "https://example.com/i-want.mp3"))
    }

    /// Without an identity (no user id) a phrase cannot be saved server-side, so
    /// the save is a no-op that returns nil without hitting the API.
    func testSaveCurrentPhraseWithoutIdentityReturnsNil() async {
        let api = FakeTalkAPIClient()
        let store = TalkStore(apiClient: api, identityProvider: nil)
        store.isOfflineFallback = true
        await store.addWord(TalkWordTile(id: "help", text: "help", pos: "verb", category: "actions"))

        let saved = await store.saveCurrentPhrase(label: "Help")

        XCTAssertNil(saved)
        XCTAssertFalse(api.didSavePhrase, "no identity means no save request")
    }

    /// Reordering with out-of-range indices is a safe no-op — the sentence is left
    /// unchanged.
    func testMoveWordIgnoresOutOfRangeIndices() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient())
        store.isOfflineFallback = true
        await store.addWord(TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"))

        await store.moveWord(from: 5, to: 0)
        await store.moveWord(from: 0, to: 9)

        XCTAssertEqual(store.sentenceWords.map(\.id), ["i"])
    }

    /// Applying an offline template fills the sentence with its ready-made words
    /// and shows the template pattern as the strip display.
    func testApplyOfflineTemplatePopulatesSentence() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient())
        store.isOfflineFallback = true

        await store.applyTemplate(TalkTemplate(id: "fallback-more", pattern: "More ___ please", category: "extras", icon: nil, slotCount: 1))

        XCTAssertEqual(store.sentenceWords.map(\.id), ["more", "please"])
        XCTAssertEqual(store.sentenceText, "more please")
        // Offline, the strip mirrors the built sentence and is speakable.
        XCTAssertEqual(store.stripDisplay, store.sentenceText)
        XCTAssertTrue(store.canSpeak)
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
