import Foundation
import TikoKit

struct TalkWordTile: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let text: String
    let pos: String
    let category: String
    let icon: String?
    let image: String?
    /// True when this is a user-added word rather than a curated pack word.
    let isCustom: Bool?

    init(id: String, text: String, pos: String, category: String, icon: String? = nil, image: String? = nil, isCustom: Bool? = nil) {
        self.id = id
        self.text = text
        self.pos = pos
        self.category = category
        self.icon = icon
        self.image = image
        self.isCustom = isCustom
    }
}

struct TalkCategory: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let label: String
    let icon: String?
    let posTypes: [String]
    let wordCount: Int
}

struct TalkTemplate: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let pattern: String
    let category: String
    let icon: String?
    let slotCount: Int
}

struct TalkSavedPhrase: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let sentence: String
    let wordIds: [String]
    let isAuto: Bool
    let usageCount: Int
    let label: String?
}

struct TalkStripState: Codable, Equatable, Sendable {
    let words: [String]?
    let display: String?
    let validNext: [String]
    let canComplete: Bool

    init(words: [String]? = nil, display: String? = nil, validNext: [String], canComplete: Bool) {
        self.words = words
        self.display = display
        self.validNext = validNext
        self.canComplete = canComplete
    }
}

struct TalkSentenceStartResponse: Codable, Equatable, Sendable {
    let templates: [TalkTemplate]
    let initialCategories: [TalkCategory]
    let initialWords: [TalkWordTile]
    let savedPhrases: [TalkSavedPhrase]
    let stripState: TalkStripState
}

struct TalkSentenceNextRequest: Codable, Equatable, Sendable {
    let locale: String
    let userId: String?
    let currentWords: [String]
}

struct TalkSentenceNextResponse: Codable, Equatable, Sendable {
    let suggestions: [TalkWordTile]
    let categories: [TalkCategory]
    let words: [String: [TalkWordTile]]
    let stripState: TalkStripState
}

struct TalkSentenceCompleteRequest: Codable, Equatable, Sendable {
    let locale: String
    let userId: String?
    let wordIds: [String]
    let autoSave: Bool?
}

struct TalkSentenceCompleteResponse: Codable, Equatable, Sendable {
    let sentence: String
    let audioUrl: String
    let audioCached: Bool
    let savedPhraseId: String?
    let templateMatch: String?
}

struct TalkSentenceVocabularyResponse: Codable, Equatable, Sendable {
    let words: [TalkWordTile]
    let categories: [TalkCategory]
    let totalWords: Int
}

struct TalkSentencePhrasesResponse: Codable, Equatable, Sendable {
    let phrases: [TalkSavedPhrase]
}

struct TalkSaveSentencePhraseRequest: Codable, Equatable, Sendable {
    let locale: String
    let userId: String
    let wordIds: [String]
    let label: String?
}

struct TalkSaveSentencePhraseResponse: Codable, Equatable, Sendable {
    let phrase: TalkSavedPhrase
}

struct TalkDeleteSentencePhraseResponse: Codable, Equatable, Sendable {
    let deleted: Bool
}

extension Array where Element == TalkWordTile {
    /**
     The sentence these tiles make, built on the device.

     This used to be `map(\.text).joined(separator: " ")`, which is why the board
     said "ik wil appel". `TikoSentenceBuilder` runs the same grammar the web app and
     the API run — 54 languages, from a bundle that ships with the app — so a child
     with no signal gets the sentence, not a list of words.
     */
    func talkSentence(locale: String, customWordIds: Set<String> = []) -> TikoSentence {
        TikoSentenceBuilder.shared.sentence(
            for: map { TikoSentenceWord(id: $0.id, text: $0.text, pos: $0.pos, category: $0.category) },
            locale: locale,
            customWordIds: customWordIds
        )
    }

    func deduplicatedById() -> [TalkWordTile] {
        var seen = Set<String>()
        return filter { word in
            if seen.contains(word.id) { return false }
            seen.insert(word.id)
            return true
        }
    }
}
