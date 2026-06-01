import Foundation

actor CardsMediaClient {
    private let baseURL: URL
    private let session: URLSession

    init(baseURL: URL = URL(string: "https://media-api.tikotalks.com/v1")!, session: URLSession = .shared) {
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
    static func match(collection: CardCollection, mediaItems: [TikoMediaItem]) -> (cards: [CommunicationCard], thumbnailURL: URL?) {
        var updates: [String: URL] = [:]
        var matchedURLs = Set<URL>()
        var mediaByName: [String: TikoMediaItem] = [:]

        for item in mediaItems {
            mediaByName[normalize(item.name)] = item
            mediaByName[normalize(item.title)] = item
        }

        for card in collection.cards {
            if let item = mediaByName[normalize(card.title)] {
                updates[card.id] = resizedCDNURL(item.originalURL)
                matchedURLs.insert(item.originalURL)
            }
        }

        for card in collection.cards where updates[card.id] == nil {
            let cardWords = Set(words(card.title))
            guard !cardWords.isEmpty else { continue }

            if let item = mediaItems.first(where: { item in
                guard !matchedURLs.contains(item.originalURL) else { return false }
                let tagMatch = item.tags.contains { tag in
                    let tagWords = words(tag)
                    return tagWords.contains { cardWords.contains($0) }
                }
                let nameMatch = words(item.name).contains { cardWords.contains($0) }
                return tagMatch || nameMatch
            }) {
                updates[card.id] = resizedCDNURL(item.originalURL)
                matchedURLs.insert(item.originalURL)
            }
        }

        let cards = collection.cards.map { card in
            var copy = card
            copy.imageURL = updates[card.id]
            return copy
        }

        return (cards, mediaItems.first.map { resizedCDNURL($0.originalURL) })
    }

    static func resizedCDNURL(_ originalURL: URL) -> URL {
        guard originalURL.host == "data.tikocdn.org", originalURL.path.hasPrefix("/uploads/") else {
            return originalURL
        }
        return URL(string: "https://data.tikocdn.org/cdn-cgi/image/width=300,quality=80,f=auto\(originalURL.path)") ?? originalURL
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
