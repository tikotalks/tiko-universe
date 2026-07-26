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

    /// The tiles go through the realizer, so the strip is a sentence rather than a
    /// list of words. "juice" is a mass noun and takes no article; "apple" does.
    func testSentenceIsRealizedNotJoined() {
        let words = [
            TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"),
            TalkWordTile(id: "want", text: "want", pos: "verb", category: "actions"),
            TalkWordTile(id: "juice", text: "juice", pos: "noun", category: "things")
        ]

        let sentence = words.talkSentence(locale: "en")
        XCTAssertEqual(sentence.strip, "I want juice")
        XCTAssertEqual(sentence.text, "I want juice.")
    }

    /// The same tiles in Dutch: the realizer conjugates and adds the article that no
    /// tile provided. This is the case the old joiner got wrong.
    func testSentenceInflectsInDutch() {
        let words = [
            TalkWordTile(id: "i", text: "ik", pos: "pronoun", category: "pronouns"),
            TalkWordTile(id: "want", text: "willen", pos: "verb", category: "actions"),
            TalkWordTile(id: "apple", text: "appel", pos: "noun", category: "food")
        ]

        XCTAssertEqual(words.talkSentence(locale: "nl").strip, "Ik wil een appel")
    }

    /// A word the child added themselves is a name, so it takes no article.
    func testCustomWordIsTreatedAsAName() {
        let words = [
            TalkWordTile(id: "i", text: "ik", pos: "pronoun", category: "pronouns"),
            TalkWordTile(id: "want", text: "willen", pos: "verb", category: "actions"),
            TalkWordTile(id: "uword-1", text: "Sil", pos: "noun", category: "people")
        ]

        XCTAssertEqual(
            words.talkSentence(locale: "nl", customWordIds: ["uword-1"]).strip,
            "Ik wil Sil"
        )
    }

    /// The board with no network is the whole pack that ships with the app — 295
    /// words and its templates — not a seven-word stub.
    func testLocalBoardIsTheFullPack() throws {
        let board = try XCTUnwrap(TalkLocalBoard.startResponse(locale: "en"))

        XCTAssertEqual(board.initialWords.count, 295)
        XCTAssertTrue(board.initialWords.contains { $0.id == "i" })
        XCTAssertTrue(board.initialWords.contains { $0.id == "apple" })
        XCTAssertFalse(board.templates.isEmpty)
        XCTAssertTrue(board.initialCategories.count > 3, "the pack has more than the three stub categories")
    }

    /// Every language in the picker has a pack on the device, in its own words.
    func testLocalBoardExistsForOtherLanguages() throws {
        for locale in ["nl", "de", "fr", "es", "pl", "ar", "ja"] {
            let board = try XCTUnwrap(TalkLocalBoard.startResponse(locale: locale), "no pack for \(locale)")
            XCTAssertEqual(board.initialWords.count, 295, "\(locale) pack is the wrong size")
        }
        let dutch = try XCTUnwrap(TalkLocalBoard.startResponse(locale: "nl"))
        XCTAssertEqual(dutch.initialWords.first { $0.id == "apple" }?.text, "appel")
    }

    func testStoreMutatesSentenceWithoutAPICalls() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient())
        store.isOffline = true
        let word = TalkWordTile(id: "help", text: "help", pos: "verb", category: "actions")

        await store.addWord(word)
        // One verb tile and nobody named: the child is the subject, so it is
        // "Help.", not "Helps." and not the bare tile.
        XCTAssertEqual(store.sentenceText, "Help.")
        XCTAssertTrue(store.canSpeak)

        await store.removeWord(id: "help")
        XCTAssertEqual(store.sentenceText, "")
        XCTAssertFalse(store.canSpeak)
    }

    func testClearSentenceResetsCompletionState() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient())
        store.isOffline = true
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
        // The strip is built on the device now, so it shows the sentence so far
        // rather than the API's slot placeholder.
        XCTAssertEqual(store.stripDisplay, "I")
        // Whatever the child has built can be spoken: the sentence is made here, and
        // an AAC board does not withhold a child's voice waiting for a server.
        XCTAssertTrue(store.canSpeak)
    }

    func testStoreSupportsReorderWithoutChangingWords() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient())
        store.isOffline = true
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
    func testLoadLocalBoardForCapturePopulatesBoard() {
        let store = TalkStore(apiClient: FakeTalkAPIClient(), identityProvider: FakeTalkIdentityProvider())

        store.loadLocalBoardForCapture()

        XCTAssertTrue(store.isOffline)
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

        // A word the child typed is a name: no article, and the sentence is
        // punctuated because this is the text that gets spoken.
        XCTAssertEqual(store.sentenceText, "I Sil.")
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
        XCTAssertEqual(store.completedSentence, "Mum.")
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
        let words = [
            TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"),
            TalkWordTile(id: "want", text: "want", pos: "verb", category: "actions"),
            TalkWordTile(id: "help", text: "help", pos: "verb", category: "actions")
        ]

        let resolved = words.matching(ids: ["help", "i", "unknown", "want"])

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

    // MARK: - The board that ships with the app

    /// A template's words are the ones its own pattern names, resolved against the
    /// pack — no per-template special cases.
    func testTemplateWordsComeFromThePattern() throws {
        let board = try XCTUnwrap(TalkLocalBoard.startResponse(locale: "en"))

        func words(_ pattern: String) -> [String] {
            TalkLocalBoard.templateWords(
                for: TalkTemplate(id: "t", pattern: pattern, category: "needs", icon: nil, slotCount: 0),
                in: board.initialWords
            ).map(\.id)
        }

        XCTAssertEqual(words("I want ___"), ["i", "want"])
        XCTAssertEqual(words("I need help"), ["i", "need", "help"])
        XCTAssertTrue(words("___").isEmpty, "a pattern with only a slot names no words")
    }

    /// Suggestions with no server: what the grammar allows, most frequent first.
    func testLocalSuggestionsFollowThePacksTransitions() {
        let chosen = [TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns")]

        let allowed = TalkLocalBoard.validNext(after: chosen, locale: "en")
        let suggestions = TalkLocalBoard.suggestions(after: chosen, locale: "en")

        XCTAssertFalse(allowed.isEmpty, "the pack states what may follow a pronoun")
        XCTAssertFalse(suggestions.isEmpty)
        for word in suggestions {
            XCTAssertTrue(allowed.contains(word.pos), "\(word.id) (\(word.pos)) cannot follow a pronoun")
        }
        XCTAssertFalse(suggestions.contains { $0.id == "i" }, "a word already chosen is not suggested again")
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
        store.loadLocalBoardForCapture()

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
        store.isOffline = true
        await store.addWord(TalkWordTile(id: "help", text: "help", pos: "verb", category: "actions"))

        let saved = await store.saveCurrentPhrase(label: "Help")

        XCTAssertNil(saved)
        XCTAssertFalse(api.didSavePhrase, "no identity means no save request")
    }

    /// Reordering with out-of-range indices is a safe no-op — the sentence is left
    /// unchanged.
    func testMoveWordIgnoresOutOfRangeIndices() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient())
        store.isOffline = true
        await store.addWord(TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns"))

        await store.moveWord(from: 5, to: 0)
        await store.moveWord(from: 0, to: 9)

        XCTAssertEqual(store.sentenceWords.map(\.id), ["i"])
    }

    /// Applying an offline template fills the sentence with its ready-made words
    /// and shows the template pattern as the strip display.
    func testApplyTemplatePopulatesSentenceFromThePack() async {
        let store = TalkStore(apiClient: FakeTalkAPIClient())
        store.isOffline = true

        await store.applyTemplate(TalkTemplate(id: "more-please", pattern: "More ___ please", category: "extras", icon: nil, slotCount: 1))

        XCTAssertEqual(store.sentenceWords.map(\.id), ["more", "please"])
        // "please" follows what it applies to, and the realizer punctuates it.
        XCTAssertEqual(store.sentenceText, "More, please.")
        // A template with an empty slot keeps showing its shape, so the child can
        // see where the missing word goes; the next tap replaces it with the strip.
        XCTAssertEqual(store.stripDisplay, "More ___ please")
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
