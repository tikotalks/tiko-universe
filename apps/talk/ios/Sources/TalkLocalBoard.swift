import Foundation
import TikoKit

/**
 The board, from the pack in the app.

 This replaces `TalkOfflineFallback`, which was seven English words and three
 hard-coded templates standing in for the real thing when the network failed. That is
 the wrong shape for an app a child depends on: the words a child needs and the
 grammar that turns them into a sentence are not per-user data and do not change
 between requests, so they ship with the app. All 54 packs are in TikoKit's resources
 — 295 words and 24 templates each — and this reads the one for the child's language.

 What still needs a server is the part that genuinely does: which word *this* child is
 likely to want next, their saved phrases, and recorded speech. `TalkStore` asks for
 those, and treats them as improvements on a board that already works.
 */
enum TalkLocalBoard {
    /// Everything the board needs for a language, or nil if no pack ships for it.
    static func startResponse(locale: String) -> TalkSentenceStartResponse? {
        guard let pack = try? TikoSentenceBuilder.shared.pack(for: locale) else { return nil }
        let words = pack.words.map(tile(from:))
        return TalkSentenceStartResponse(
            templates: pack.templates.map { template in
                TalkTemplate(
                    id: template.id,
                    pattern: template.pattern,
                    category: template.category,
                    icon: template.icon,
                    slotCount: slotCount(in: template.pattern)
                )
            },
            initialCategories: categories(in: words),
            initialWords: words,
            // Saved phrases belong to a child, so they come from the server or
            // nowhere. An empty list is the honest answer offline.
            savedPhrases: [],
            stripState: TalkStripState(words: [], validNext: [], canComplete: false)
        )
    }

    /// The words a template starts the child off with: the ones its pattern names.
    static func templateWords(for template: TalkTemplate, in words: [TalkWordTile]) -> [TalkWordTile] {
        let tokens = template.pattern
            .replacingOccurrences(of: "___", with: " ")
            .split { !$0.isLetter && !$0.isNumber && $0 != "'" }
            .map { String($0).lowercased() }
        return tokens.compactMap { token in
            words.first { $0.text.lowercased() == token || $0.id.lowercased() == token }
        }.deduplicatedById()
    }

    /// Which parts of speech may follow what the child has chosen, from the pack's
    /// own transition table — the same one the API reads.
    static func validNext(after chosen: [TalkWordTile], locale: String) -> [String] {
        guard let pack = try? TikoSentenceBuilder.shared.pack(for: locale) else { return [] }
        return TikoSentenceBuilder.shared.validNext(
            after: chosen.map { TikoSentenceWord(id: $0.id, text: $0.text, pos: $0.pos, category: $0.category) },
            in: pack
        )
    }

    /**
     Suggestions without a server: the words that may legally follow, most frequent
     first. The API ranks better because it has watched this child — but this is what
     makes the board usable before it answers, or when it never does.
     */
    static func suggestions(after chosen: [TalkWordTile], locale: String, limit: Int = 24) -> [TalkWordTile] {
        guard let pack = try? TikoSentenceBuilder.shared.pack(for: locale) else { return [] }
        let allowed = Set(validNext(after: chosen, locale: locale))
        let used = Set(chosen.map(\.id))
        return pack.words
            .filter { !used.contains($0.id) && (allowed.isEmpty || allowed.contains($0.pos)) }
            .sorted { ($0.frequency ?? 0) > ($1.frequency ?? 0) }
            .prefix(limit)
            .map(tile(from:))
    }

    /// True where this language's pack ships with the app.
    static func hasPack(for locale: String) -> Bool {
        TikoSentenceBuilder.shared.hasPack(for: locale)
    }

    // MARK: - Private

    private static func tile(from word: TikoTalkPack.Word) -> TalkWordTile {
        TalkWordTile(
            id: word.id,
            text: word.text,
            pos: word.pos,
            category: word.category,
            icon: word.icon,
            image: word.image
        )
    }

    /// The categories the pack's own words imply, in the order the pack lists them.
    private static func categories(in words: [TalkWordTile]) -> [TalkCategory] {
        var order: [String] = []
        var counts: [String: Int] = [:]
        var posTypes: [String: Set<String>] = [:]
        for word in words {
            if counts[word.category] == nil { order.append(word.category) }
            counts[word.category, default: 0] += 1
            posTypes[word.category, default: []].insert(word.pos)
        }
        return order.map { id in
            TalkCategory(
                id: id,
                label: label(for: id),
                icon: "square.grid.2x2",
                posTypes: (posTypes[id] ?? []).sorted(),
                wordCount: counts[id] ?? 0
            )
        }
    }

    /// "hot-drink" → "Hot drink", which is what a category id is short for.
    private static func label(for id: String) -> String {
        let spaced = id.replacingOccurrences(of: "-", with: " ").replacingOccurrences(of: "_", with: " ")
        return spaced.prefix(1).uppercased() + spaced.dropFirst()
    }

    /// A pattern's blanks are the slots the child fills.
    private static func slotCount(in pattern: String) -> Int {
        pattern.components(separatedBy: "___").count - 1
    }
}

extension Array where Element == TalkWordTile {
    func matching(ids: [String]) -> [TalkWordTile] {
        ids.compactMap { id in first { $0.id == id } }
    }
}
