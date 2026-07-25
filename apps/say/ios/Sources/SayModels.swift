import Foundation

// MARK: - Category

struct SayCategory: Identifiable, Codable, Hashable {
    let id: String
    /// TikoI18n key for the category title, e.g. `say.category.animals`.
    let titleKey: String
    let emoji: String
    let sortOrder: Int
    /// Tiko media library categories used to resolve real card images.
    var mediaCategories: [String] = []
}

// MARK: - Card

/// The practice unit. Every card has a shown title, a speak text and one or
/// more listen-for targets — each independently editable in Parent Mode.
struct SayCard: Identifiable, Codable, Hashable {
    let id: String
    let categoryID: String
    /// Written label shown on the practice screen.
    var title: String
    /// What the app says aloud. Defaults to the title but is editable separately.
    var speakText: String
    /// Recognition targets. First entry is the primary target, the rest are
    /// accepted alternatives.
    var listenFor: [String]
    /// Bundled glyph shown while no media image is available; keeps default
    /// content fully offline-capable.
    var emoji: String
    /// Parent-picked image (Tiko media library or upload). Default cards
    /// without one resolve a library image automatically at runtime.
    var imageURL: URL?
    var difficulty: Int
    let isCustom: Bool
    var isHidden: Bool
    var sortOrder: Int
}

// MARK: - Card override

/// A Parent Mode edit of a default card, keyed by card ID and language.
/// Edits never mutate the bundled catalogue, so a card can always be reset,
/// and an edit in one language never affects another language's defaults.
struct SayCardOverride: Codable, Hashable {
    let cardID: String
    let languageCode: String
    var title: String?
    var speakText: String?
    var listenFor: [String]?
    var emoji: String?
    var imageURL: URL?
    var isHidden: Bool = false
    var sortOrder: Int?

    var isEmpty: Bool {
        title == nil && speakText == nil && listenFor == nil && emoji == nil
            && imageURL == nil && !isHidden && sortOrder == nil
    }
}

// MARK: - Recognition

// MatchType is TikoKit's TikoMatchType (see SayEngineAliases.swift).

struct RecognitionResult: Equatable {
    let transcript: String
    let isFinal: Bool
    let matchType: MatchType?
}

// MARK: - Practice state

enum PracticeState: Equatable {
    case idle
    case presenting
    case speaking
    case preparingToListen
    case listening
    case processing
    case retrying(attempt: Int)
    case celebrating
    case permissionRequired
    case recognitionUnavailable
    case completed
    case error(String)
}

// MARK: - Session

struct PracticeSession {
    let category: SayCategory
    let cards: [SayCard]
    var currentIndex: Int = 0
    var attemptsByCard: [String: Int] = [:]
    var completedCardIDs: Set<String> = []
    var skippedCardIDs: Set<String> = []

    var currentCard: SayCard? {
        guard cards.indices.contains(currentIndex) else { return nil }
        return cards[currentIndex]
    }

    var isFinished: Bool { currentIndex >= cards.count }
}
