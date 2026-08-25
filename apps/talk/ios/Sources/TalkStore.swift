import Foundation
import TikoKit
import Observation

@MainActor
@Observable
final class TalkStore {
    private let apiClient: any TalkSentenceAPI
    private let identityProvider: (any TalkIdentityProviding)?

    var locale = "en"
    var userId: String?
    var sessionToken: String?
    var isLoading = false
    // True while a /next prediction request is in flight (drives a subtle loader).
    var isPredicting = false
    /// True when the server could not be reached. The board still works — the pack
    /// and the grammar are in the app — so this only means no learned suggestions,
    /// no saved phrases and no recorded speech.
    var isOffline = false
    var sentenceWords: [TalkWordTile] = []
    var templates: [TalkTemplate] = []
    var categories: [TalkCategory] = []
    var wordsByCategory: [String: [TalkWordTile]] = [:]
    var visibleWords: [TalkWordTile] = []
    var suggestions: [TalkWordTile] = []
    // The board's starting vocabulary, restored when the sentence is cleared.
    private var baselineWords: [TalkWordTile] = []
    var savedPhrases: [TalkSavedPhrase] = []
    var selectedCategoryId: String?
    var errorMessage: String?
    var completedSentence: String?
    var audioURL: URL?
    var stripDisplay: String = ""
    var validNext: [String] = []
    private var serverCanComplete = false
    private var cachedPackWords: [String: [TalkWordTile]] = [:]

    init(apiClient: any TalkSentenceAPI = TalkAPIClient(), identityProvider: (any TalkIdentityProviding)? = TikoTalkIdentityProvider()) {
        self.apiClient = apiClient
        self.identityProvider = identityProvider
    }

    /// The words this child added themselves, which the realizer treats as names.
    private var customWordIds: Set<String> {
        Set(sentenceWords.map(\.id).filter { $0.hasPrefix("uword-") })
    }

    /// The finished sentence, with its article and full stop, built on the device.
    var sentenceText: String {
        sentenceWords.talkSentence(locale: locale, customWordIds: customWordIds).text
    }

    /// The same sentence without its terminator: the strip is not finished yet.
    private var localStrip: String {
        sentenceWords.talkSentence(locale: locale, customWordIds: customWordIds).strip
    }

    /// True where the pack for this language ships with the app, which is every
    /// language the picker offers.
    var hasLocalPack: Bool { TikoSentenceBuilder.shared.hasPack(for: locale) }

    /// Anything the child has built can be spoken: the sentence is made here.
    var canSpeak: Bool {
        serverCanComplete || !sentenceWords.isEmpty
    }

    var filteredWords: [TalkWordTile] {
        guard let selectedCategoryId, !selectedCategoryId.isEmpty else { return visibleWords }
        if let categoryWords = wordsByCategory[selectedCategoryId], !categoryWords.isEmpty {
            return categoryWords
        }
        return visibleWords.filter { $0.category == selectedCategoryId }
    }

    /// Every word for the board, ordered by likelihood: ranked next-word
    /// suggestions first, then the rest of the vocabulary. Categories are not
    /// split out — the whole board shows at once.
    var boardWords: [TalkWordTile] {
        guard !suggestions.isEmpty else { return visibleWords }
        var seen = Set(suggestions.map(\.id))
        var result = suggestions
        for word in visibleWords where !seen.contains(word.id) {
            result.append(word)
            seen.insert(word.id)
        }
        return result
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        await bootstrapIdentityIfNeeded()

        // The board comes from the pack in the app, first and always. The server is
        // asked afterwards, and what it returns is an improvement on this rather
        // than the thing that makes the screen work.
        if let local = TalkLocalBoard.startResponse(locale: locale) {
            applyStartResponse(local, offline: true)
        }

        do {
            // Identity is carried by the session token (Authorization header); the
            // server derives the subject from it. We deliberately do NOT pass userId
            // — an unvalidatable userId is rejected, and the token is the source of
            // truth (and the IDOR-safe contract).
            let response = try await apiClient.start(locale: locale, userId: nil, sessionToken: sessionToken)
            applyStartResponse(response, offline: false)
            await refreshVocabularyIfPossible()
        } catch {
            // No server is not an error state for this app; the board is already on
            // screen. Only say why in debug, where it is worth knowing.
            #if DEBUG
            errorMessage = "offline: \(error.localizedDescription)"
            #else
            errorMessage = nil
            #endif
            if visibleWords.isEmpty, let local = TalkLocalBoard.startResponse(locale: locale) {
                applyStartResponse(local, offline: true)
            }
        }
    }

    /// Seeds the board from the pack with no network access, for screenshot capture
    /// and UI tests. This is the same board the app shows offline, which is the same
    /// board it shows online — the server only reorders it.
    func loadLocalBoardForCapture() {
        guard let local = TalkLocalBoard.startResponse(locale: locale) else { return }
        applyStartResponse(local, offline: true)
    }

    func addWord(_ word: TalkWordTile) async {
        sentenceWords.append(word)
        await refreshSuggestions()
    }

    func removeWord(id: String) async {
        guard let index = sentenceWords.firstIndex(where: { $0.id == id }) else { return }
        sentenceWords.remove(at: index)
        await refreshSuggestions()
    }

    func moveWord(from source: Int, to destination: Int) async {
        guard sentenceWords.indices.contains(source), destination >= 0, destination <= sentenceWords.count else { return }
        let word = sentenceWords.remove(at: source)
        sentenceWords.insert(word, at: min(destination, sentenceWords.count))
        await refreshSuggestions()
    }

    func selectCategory(id: String?) {
        selectedCategoryId = id
    }

    func clearSentence() {
        sentenceWords = []
        suggestions = []
        completedSentence = nil
        audioURL = nil
        stripDisplay = ""
        serverCanComplete = false
        // Clearing the sentence also returns the board to its starting options.
        resetBoardToBaseline()
    }

    private func resetBoardToBaseline() {
        guard !baselineWords.isEmpty else { return }
        visibleWords = baselineWords
        wordsByCategory = Dictionary(grouping: baselineWords, by: \.category)
        selectedCategoryId = nil
    }

    func applyTemplate(_ template: TalkTemplate) async {
        let prefilledWords = wordsForTemplatePattern(template.pattern)
        guard !prefilledWords.isEmpty || template.slotCount > 0 else {
            errorMessage = "This template needs the Sentence API before it can fill words."
            return
        }

        sentenceWords = prefilledWords
        stripDisplay = template.pattern
        if prefilledWords.isEmpty {
            suggestions = []
            serverCanComplete = false
        } else {
            await refreshSuggestions()
            stripDisplay = template.pattern
        }
    }

    func selectPhrase(_ phrase: TalkSavedPhrase) {
        let availableWords = allKnownWords()
        sentenceWords = availableWords.matching(ids: phrase.wordIds)
        completedSentence = phrase.sentence
        stripDisplay = phrase.sentence
        serverCanComplete = true
    }

    func completeSentence(autoSave: Bool = true) async -> TalkSentenceCompleteResponse? {
        guard !sentenceWords.isEmpty else { return nil }
        // A locally-added custom word can't be resolved server-side; speak the
        // built sentence with on-device speech instead of calling /complete.
        if sentenceWords.contains(where: { $0.id.hasPrefix("uword-local-") }) {
            completedSentence = sentenceText
            audioURL = nil
            return nil
        }

        do {
            let response = try await apiClient.complete(
                wordIds: sentenceWords.map(\.id),
                locale: locale,
                autoSave: autoSave,
                userId: nil,
                sessionToken: sessionToken
            )
            completedSentence = response.sentence
            audioURL = URL(string: response.audioUrl)
            if let savedPhraseId = response.savedPhraseId, !savedPhrases.contains(where: { $0.id == savedPhraseId }) {
                await refreshSavedPhrasesIfPossible()
            }
            return response
        } catch {
            completedSentence = sentenceText
            audioURL = nil
            if !isOffline {
                errorMessage = "Using native speech fallback"
            }
            return nil
        }
    }

    func saveCurrentPhrase(label: String? = nil) async -> TalkSavedPhrase? {
        guard let userId, !sentenceWords.isEmpty else { return nil }
        do {
            let response = try await apiClient.savePhrase(
                locale: locale,
                userId: userId,
                wordIds: sentenceWords.map(\.id),
                label: label,
                sessionToken: sessionToken
            )
            upsertSavedPhrase(response.phrase)
            return response.phrase
        } catch {
            errorMessage = "Could not save phrase"
            return nil
        }
    }

    func deletePhrase(id: String) async {
        guard let userId else { return }
        do {
            _ = try await apiClient.deletePhrase(phraseId: id, locale: locale, userId: userId, sessionToken: sessionToken)
            savedPhrases.removeAll { $0.id == id }
        } catch {
            errorMessage = "Could not delete phrase"
        }
    }

    private func bootstrapIdentityIfNeeded() async {
        guard userId == nil, let identityProvider else { return }
        do {
            let context = try await identityProvider.bootstrapIdentity()
            userId = context.userId
            sessionToken = context.sessionToken
        } catch {
            errorMessage = "Identity unavailable"
        }
    }

    private func applyStartResponse(_ response: TalkSentenceStartResponse, offline: Bool) {
        isOffline = offline
        templates = response.templates
        categories = response.initialCategories
        visibleWords = response.initialWords.deduplicatedById()
        baselineWords = visibleWords
        wordsByCategory = Dictionary(grouping: visibleWords, by: \.category)
        suggestions = []
        // The server knows this child's saved phrases; the pack cannot, so an empty
        // list from it must not wipe what the server already gave us.
        if !offline || !response.savedPhrases.isEmpty { savedPhrases = response.savedPhrases }
        stripDisplay = localStrip
        validNext = response.stripState.validNext
        serverCanComplete = response.stripState.canComplete
        selectedCategoryId = categories.first?.id
        if sentenceWords.isEmpty {
            completedSentence = nil
            audioURL = nil
        }
    }

    private func refreshSuggestions() async {
        completedSentence = nil
        audioURL = nil
        guard !sentenceWords.isEmpty else {
            suggestions = []
            stripDisplay = ""
            serverCanComplete = false
            // Back to an empty sentence -> show the starting options again.
            resetBoardToBaseline()
            return
        }
        // Offline, the pack's own frequencies and transition table stand in for the
        // ranking the server would have done.
        guard !isOffline else {
            suggestions = TalkLocalBoard.suggestions(after: sentenceWords, locale: locale)
            validNext = TalkLocalBoard.validNext(after: sentenceWords, locale: locale)
            stripDisplay = localStrip
            serverCanComplete = true
            return
        }
        // Locally-added custom words aren't in the language pack, so /next would
        // reject the whole id list. Keep the current board and stay speakable.
        guard !sentenceWords.contains(where: { $0.id.hasPrefix("uword-local-") }) else {
            stripDisplay = localStrip
            serverCanComplete = true
            return
        }

        isPredicting = true
        defer { isPredicting = false }
        do {
            let response = try await apiClient.next(
                currentWords: sentenceWords.map(\.id),
                locale: locale,
                userId: nil,
                sessionToken: sessionToken
            )
            suggestions = response.suggestions
            categories = response.categories
            wordsByCategory = response.words.mapValues { $0.deduplicatedById() }
            visibleWords = response.words.keys.sorted().flatMap { wordsByCategory[$0] ?? [] }.deduplicatedById()
            if selectedCategoryId == nil || !categories.contains(where: { $0.id == selectedCategoryId }) {
                selectedCategoryId = categories.first?.id
            }
            stripDisplay = localStrip
            validNext = response.stripState.validNext
            serverCanComplete = response.stripState.canComplete
        } catch {
            // Keep the board populated (don't wipe suggestions) and still allow
            // speaking what's built. Only surface the reason in debug.
            stripDisplay = localStrip
            serverCanComplete = true
            #if DEBUG
            errorMessage = "next: \(error.localizedDescription)"
            #else
            errorMessage = nil
            #endif
        }
    }

    private func refreshVocabularyIfPossible() async {
        guard !isOffline else { return }
        do {
            let response = try await apiClient.vocabulary(locale: locale, category: nil, pos: nil, sessionToken: sessionToken)
            mergeCategories(response.categories)
            let current = visibleWords + response.words
            visibleWords = current.deduplicatedById()
            // The full vocabulary becomes the baseline the board resets to.
            baselineWords = visibleWords
            wordsByCategory = Dictionary(grouping: visibleWords, by: \.category).mapValues { $0.deduplicatedById() }
        } catch {
            // Start response still provides enough initial data; keep the app usable.
        }
    }

    private func refreshSavedPhrasesIfPossible() async {
        guard let userId, !isOffline else { return }
        do {
            let response = try await apiClient.phrases(locale: locale, userId: userId, sessionToken: sessionToken)
            savedPhrases = response.phrases
        } catch {
            // Saved phrases are optional for anonymous/offline operation.
        }
    }

    private func mergeCategories(_ incoming: [TalkCategory]) {
        var merged = categories
        for category in incoming where !merged.contains(where: { $0.id == category.id }) {
            merged.append(category)
        }
        categories = merged
    }

    private func upsertSavedPhrase(_ phrase: TalkSavedPhrase) {
        if let index = savedPhrases.firstIndex(where: { $0.id == phrase.id }) {
            savedPhrases[index] = phrase
        } else {
            savedPhrases.insert(phrase, at: 0)
        }
    }

    private func wordsForTemplatePattern(_ pattern: String) -> [TalkWordTile] {
        let known = allKnownWords()
        let tokens = pattern
            .replacingOccurrences(of: "___", with: " ")
            .split { !$0.isLetter && !$0.isNumber && $0 != "'" }
            .map { String($0).lowercased() }
        return tokens.compactMap { token in
            known.first { $0.text.lowercased() == token || $0.id.lowercased() == token }
        }.deduplicatedById()
    }

    /// Every word this app can name in this language: what is on the board, plus
    /// the whole pack — which is on the device whether or not the server answered.
    private func allKnownWords() -> [TalkWordTile] {
        (visibleWords + suggestions + baselineWords + packWords()).deduplicatedById()
    }

    /// The pack for the current language, read once per language.
    private func packWords() -> [TalkWordTile] {
        if let cached = cachedPackWords[locale] { return cached }
        let words = TalkLocalBoard.startResponse(locale: locale)?.initialWords ?? []
        cachedPackWords[locale] = words
        return words
    }
}
