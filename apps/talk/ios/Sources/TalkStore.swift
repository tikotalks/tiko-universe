import Foundation
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
    var isOfflineFallback = false
    var sentenceWords: [TalkWordTile] = []
    var templates: [TalkTemplate] = []
    var categories: [TalkCategory] = []
    var wordsByCategory: [String: [TalkWordTile]] = [:]
    var visibleWords: [TalkWordTile] = []
    var suggestions: [TalkWordTile] = []
    var savedPhrases: [TalkSavedPhrase] = []
    var selectedCategoryId: String?
    var errorMessage: String?
    var completedSentence: String?
    var audioURL: URL?
    var stripDisplay: String = ""
    var validNext: [String] = []
    private var serverCanComplete = false

    init(apiClient: any TalkSentenceAPI = TalkAPIClient(), identityProvider: (any TalkIdentityProviding)? = TikoTalkIdentityProvider()) {
        self.apiClient = apiClient
        self.identityProvider = identityProvider
    }

    var sentenceText: String {
        sentenceWords.talkSentenceText
    }

    var canSpeak: Bool {
        serverCanComplete || (isOfflineFallback && !sentenceWords.isEmpty)
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

        do {
            // Identity is carried by the session token (Authorization header); the
            // server derives the subject from it. We deliberately do NOT pass userId
            // — an unvalidatable userId is rejected, and the token is the source of
            // truth (and the IDOR-safe contract).
            let response = try await apiClient.start(locale: locale, userId: nil, sessionToken: sessionToken)
            applyStartResponse(response, fallback: false)
            await refreshVocabularyIfPossible()
        } catch {
            // Offline is an expected graceful-degrade state, not an error. The
            // isOfflineFallback flag already drives the banner, so don't double it
            // up in release — but in debug surface the real reason so we can see
            // exactly why a request failed.
            #if DEBUG
            errorMessage = "offline: \(error.localizedDescription)"
            #else
            errorMessage = nil
            #endif
            applyStartResponse(TalkOfflineFallback.startResponse, fallback: true)
        }
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
    }

    func applyTemplate(_ template: TalkTemplate) async {
        let fallbackWords = TalkOfflineFallback.templateWords(for: template)
        if !fallbackWords.isEmpty {
            sentenceWords = fallbackWords
            stripDisplay = template.pattern
            await refreshSuggestions()
            return
        }

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
            if !isOfflineFallback {
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

    private func applyStartResponse(_ response: TalkSentenceStartResponse, fallback: Bool) {
        isOfflineFallback = fallback
        templates = response.templates
        categories = response.initialCategories
        visibleWords = response.initialWords.deduplicatedById()
        wordsByCategory = Dictionary(grouping: visibleWords, by: \.category)
        suggestions = []
        savedPhrases = response.savedPhrases
        stripDisplay = response.stripState.display ?? ""
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
            return
        }
        guard !isOfflineFallback else {
            suggestions = []
            stripDisplay = sentenceText
            serverCanComplete = true
            return
        }

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
            stripDisplay = response.stripState.display ?? sentenceText
            validNext = response.stripState.validNext
            serverCanComplete = response.stripState.canComplete
        } catch {
            // Keep the board populated (don't wipe suggestions) and still allow
            // speaking what's built. Only surface the reason in debug.
            stripDisplay = sentenceText
            serverCanComplete = true
            #if DEBUG
            errorMessage = "next: \(error.localizedDescription)"
            #else
            errorMessage = nil
            #endif
        }
    }

    private func refreshVocabularyIfPossible() async {
        guard !isOfflineFallback else { return }
        do {
            let response = try await apiClient.vocabulary(locale: locale, category: nil, pos: nil, sessionToken: sessionToken)
            mergeCategories(response.categories)
            let current = visibleWords + response.words
            visibleWords = current.deduplicatedById()
            wordsByCategory = Dictionary(grouping: visibleWords, by: \.category).mapValues { $0.deduplicatedById() }
        } catch {
            // Start response still provides enough initial data; keep the app usable.
        }
    }

    private func refreshSavedPhrasesIfPossible() async {
        guard let userId, !isOfflineFallback else { return }
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

    private func allKnownWords() -> [TalkWordTile] {
        (visibleWords + suggestions + TalkOfflineFallback.words).deduplicatedById()
    }
}
