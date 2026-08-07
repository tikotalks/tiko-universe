import Foundation
import TikoKit

actor CardsMediaClient {
    private let baseURL: URL
    private let session: URLSession

    init(baseURL: URL = URL(string: "https://media.tikoapi.org/v1")!, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    func fetchMedia(for categories: [String], limit: Int = 100) async throws -> [TikoMediaItem] {
        var merged: [TikoMediaItem] = []
        var seen = Set<String>()

        for category in categories {
            let items = try await fetchMedia(category: category, limit: limit)
            for item in items where !seen.contains(item.id) {
                seen.insert(item.id)
                merged.append(item)
            }
        }

        return merged
    }

    /// Resolves artwork per card by searching the library for the card's own word.
    ///
    /// Fetching a category page and matching client-side cannot work: the media
    /// endpoint caps a category at its first `limit` items sorted by title, so
    /// "animals" only ever yields Aardvark…Atlantic Puffin and a card called
    /// "Cat" never sees a candidate. Searching per card is the only way the
    /// card's own word reaches the server.
    func resolveImages(for cards: [(id: String, title: String)]) async -> [String: URL] {
        await withTaskGroup(of: (String, URL?).self) { group in
            for card in cards {
                group.addTask { [self] in
                    let items = (try? await searchMedia(query: card.title)) ?? []
                    return (card.id, CardsMediaMatcher.bestMatch(for: card.title, in: items)
                        .map { CardsMediaMatcher.resizedCDNURL($0.originalURL) })
                }
            }
            var resolved: [String: URL] = [:]
            for await (id, url) in group {
                if let url { resolved[id] = url }
            }
            return resolved
        }
    }

    func searchMedia(query: String, limit: Int = 12) async throws -> [TikoMediaItem] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }
        var components = URLComponents(url: baseURL.appending(path: "media"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "type", value: "image"),
            URLQueryItem(name: "search", value: trimmed),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        guard let url = components.url else { return [] }
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(TikoMediaListResponse.self, from: data).data
    }

    private func fetchMedia(category: String, limit: Int) async throws -> [TikoMediaItem] {
        let listURL = baseURL.appending(path: "media")
        var components = URLComponents(url: listURL, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "type", value: "image"),
            URLQueryItem(name: "category", value: category),
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "sort", value: "title"),
            URLQueryItem(name: "order", value: "asc"),
        ]

        guard let url = components.url else { return [] }
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(TikoMediaListResponse.self, from: data).data
    }
}

struct CardsMediaMatcher {
    static func match(collection: CardCollection, mediaItems: [TikoMediaItem]) -> (cardImages: [String: URL], thumbnailURL: URL?) {
        var updates: [String: URL] = [:]
        var matchedURLs = Set<URL>()
        var mediaByName: [String: TikoMediaItem] = [:]

        for item in mediaItems {
            mediaByName[normalize(item.name)] = item
            mediaByName[normalize(item.title)] = item
        }

        for card in collection.cards {
            if let imageRef = card.imageRef {
                updates[card.id] = URL(string: "\(CardsContentClient.baseURL)/content/images/\(imageRef)")
                continue
            }
            if let item = mediaByName[normalize(card.title)] {
                updates[card.id] = resizedCDNURL(item.originalURL)
                matchedURLs.insert(item.originalURL)
            }
        }

        for card in collection.cards where updates[card.id] == nil {
            if let item = bestMatch(for: card.title, in: mediaItems, excluding: matchedURLs) {
                updates[card.id] = resizedCDNURL(item.originalURL)
                matchedURLs.insert(item.originalURL)
            }
        }

        return (updates, mediaItems.first.map { resizedCDNURL($0.originalURL) })
    }

    /// Modifiers that change what the picture actually *is*. "Golden Apple" is
    /// still an apple, but a Guinea Pig is not a pig and a Ninja Star is not a
    /// star. On an AAC card the wrong picture is worse than no picture, so these
    /// are refused and the card stays as text and colour.
    private static let meaningChangingModifiers: Set<String> = [
        "guinea", "ninja", "stationary", "teddy", "starfish", "sea", "toy", "model",
    ]

    /// Best library item for a card word, or nil when nothing is confident enough.
    static func bestMatch(
        for title: String,
        in items: [TikoMediaItem],
        excluding used: Set<URL> = []
    ) -> TikoMediaItem? {
        let card = words(title).map(singular)
        guard !card.isEmpty else { return nil }
        let available = items.filter { !used.contains($0.originalURL) }

        // 1. The same word, give or take a plural.
        if let exact = available.first(where: { words($0.title).map(singular) == card }) {
            return exact
        }

        // 2. One leading modifier, where the card word is still the head noun:
        //    "Indigo Bird" for Bird. This rejects "Rice Cooker" and "Pizza
        //    Cutter", where the card word is the modifier and the head is a
        //    different object entirely.
        let qualified = available.filter { item in
            let itemWords = words(item.title).map(singular)
            guard itemWords.count == card.count + 1,
                  Array(itemWords.suffix(card.count)) == card else { return false }
            return !meaningChangingModifiers.contains(itemWords[0])
        }
        return qualified.min { words($0.title).count < words($1.title).count }
    }

    /// Crude but sufficient singularisation so "Pretzels" finds "Pretzel".
    private static func singular(_ word: String) -> String {
        for (suffix, replacement) in [("ies", "y"), ("ses", ""), ("es", ""), ("s", "")]
        where word.hasSuffix(suffix) && word.count - suffix.count >= 3 {
            return String(word.dropLast(suffix.count)) + replacement
        }
        return word
    }

    static func resizedCDNURL(_ originalURL: URL) -> URL {
        TikoImageURL.resized(originalURL, width: 300, quality: 80)
    }

    private static func normalize(_ value: String) -> String {
        value.lowercased()
            .replacingOccurrences(of: #"\.[^.]+$"#, with: "", options: .regularExpression)
            .replacingOccurrences(of: #"[^a-z0-9]+"#, with: "_", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "_"))
    }

    private static func words(_ value: String) -> [String] {
        normalize(value).split(separator: "_").map(String.init).filter { !$0.isEmpty }
    }
}
