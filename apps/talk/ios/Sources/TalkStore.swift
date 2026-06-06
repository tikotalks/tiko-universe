import Foundation
import Observation

@MainActor
@Observable
final class TalkStore {
    private let apiClient: TalkAPIClient

    var locale = "en"
    var userId: String?
    var sessionToken: String?
    var isLoading = false
    var isOfflineFallback = false
    var sentenceWords: [TalkWordTile] = []
    var templates: [TalkTemplate] = []
    var categories: [TalkCategory] = []
    var visibleWords: [TalkWordTile] = []
    var suggestions: [TalkWordTile] = []
    var savedPhrases: [TalkSavedPhrase] = []
    var errorMessage: String?
    var completedSentence: String?
    var audioURL: URL?

    init(apiClient: TalkAPIClient = TalkAPIClient()) {
        self.apiClient = apiClient
    }

    var sentenceText: String {
        sentenceWords.talkSentenceText
    }

    var canSpeak: Bool {
        !sentenceWords.isEmpty
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response = try await apiClient.start(locale: locale, userId: userId, sessionToken: sessionToken)
            applyStartResponse(response, fallback: false)
        } catch {
            errorMessage = "Offline limited mode"
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

    func clearSentence() {
        sentenceWords = []
        suggestions = []
        completedSentence = nil
        audioURL = nil
    }

    func applyTemplate(_ template: TalkTemplate) async {
        let fallbackWords = TalkOfflineFallback.templateWords(for: template)
        if !fallbackWords.isEmpty {
            sentenceWords = fallbackWords
            await refreshSuggestions()
            return
        }

        errorMessage = "This template needs the Sentence API before it can fill words."
    }

    func selectPhrase(_ phrase: TalkSavedPhrase) {
        let availableWords = allKnownWords()
        sentenceWords = availableWords.matching(ids: phrase.wordIds)
        completedSentence = phrase.sentence
    }

    func completeSentence(autoSave: Bool = true) async -> TalkSentenceCompleteResponse? {
        guard !sentenceWords.isEmpty else { return nil }

        do {
            let response = try await apiClient.complete(
                wordIds: sentenceWords.map(\.id),
                locale: locale,
                autoSave: autoSave,
                userId: userId,
                sessionToken: sessionToken
            )
            completedSentence = response.sentence
            audioURL = URL(string: response.audioUrl)
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

    private func applyStartResponse(_ response: TalkSentenceStartResponse, fallback: Bool) {
        isOfflineFallback = fallback
        templates = response.templates
        categories = response.initialCategories
        visibleWords = response.initialWords
        suggestions = []
        savedPhrases = response.savedPhrases
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
            return
        }
        guard !isOfflineFallback else {
            suggestions = []
            return
        }

        do {
            let response = try await apiClient.next(
                currentWords: sentenceWords.map(\.id),
                locale: locale,
                userId: userId,
                sessionToken: sessionToken
            )
            suggestions = response.suggestions
            categories = response.categories
            visibleWords = response.words.values.flatMap { $0 }
        } catch {
            suggestions = []
            errorMessage = "Suggestions unavailable"
        }
    }

    private func allKnownWords() -> [TalkWordTile] {
        var known = visibleWords + suggestions + TalkOfflineFallback.words
        var seen = Set<String>()
        known.removeAll { word in
            if seen.contains(word.id) { return true }
            seen.insert(word.id)
            return false
        }
        return known
    }
}
