import Foundation

enum TalkOfflineFallback {
    static let startResponse = TalkSentenceStartResponse(
        templates: [
            TalkTemplate(id: "fallback-i-want", pattern: "I want ___", category: "needs", icon: "bubble.left.fill", slotCount: 1),
            TalkTemplate(id: "fallback-help", pattern: "I need help", category: "needs", icon: "hands.sparkles.fill", slotCount: 0),
            TalkTemplate(id: "fallback-more", pattern: "More ___ please", category: "extras", icon: "plus.circle.fill", slotCount: 1)
        ],
        initialCategories: [
            TalkCategory(id: "pronouns", label: "Pronouns", icon: "person.fill", posTypes: ["pronoun"], wordCount: 2),
            TalkCategory(id: "actions", label: "Actions", icon: "figure.walk", posTypes: ["verb"], wordCount: 3),
            TalkCategory(id: "extras", label: "Extras", icon: "sparkles", posTypes: ["modifier", "polite"], wordCount: 2)
        ],
        initialWords: words,
        savedPhrases: [
            TalkSavedPhrase(id: "fallback-help-phrase", sentence: "I need help", wordIds: ["i", "need", "help"], isAuto: false, usageCount: 1, label: "I need help")
        ],
        stripState: TalkStripState(words: [], validNext: ["pronoun", "verb", "modifier"], canComplete: false)
    )

    static let words: [TalkWordTile] = [
        TalkWordTile(id: "i", text: "I", pos: "pronoun", category: "pronouns", icon: "person.fill"),
        TalkWordTile(id: "you", text: "you", pos: "pronoun", category: "pronouns", icon: "person.2.fill"),
        TalkWordTile(id: "want", text: "want", pos: "verb", category: "actions", icon: "hand.tap.fill"),
        TalkWordTile(id: "need", text: "need", pos: "verb", category: "actions", icon: "exclamationmark.circle.fill"),
        TalkWordTile(id: "help", text: "help", pos: "verb", category: "actions", icon: "hands.sparkles.fill"),
        TalkWordTile(id: "more", text: "more", pos: "modifier", category: "extras", icon: "plus.circle.fill"),
        TalkWordTile(id: "please", text: "please", pos: "polite", category: "extras", icon: "heart.fill")
    ]

    static func templateWords(for template: TalkTemplate) -> [TalkWordTile] {
        switch template.id {
        case "fallback-i-want":
            words.matching(ids: ["i", "want"])
        case "fallback-help":
            words.matching(ids: ["i", "need", "help"])
        case "fallback-more":
            words.matching(ids: ["more", "please"])
        default:
            []
        }
    }
}

extension Array where Element == TalkWordTile {
    func matching(ids: [String]) -> [TalkWordTile] {
        ids.compactMap { id in first { $0.id == id } }
    }
}
