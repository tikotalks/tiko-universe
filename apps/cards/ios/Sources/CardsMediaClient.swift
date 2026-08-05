import Foundation
import TikoKit

actor CardsMediaClient {
    private let baseURL: URL
    private let session: URLSession

    init(baseURL: URL = URL(string: "https://media.tikoapi.org/v1")!, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    /// Maximum pages walked per category. A category is a few hundred items, so
    /// this is a safety stop, not the expected path — `wantedTitles` normally
    /// ends the walk much earlier.
    private static let maxPages = 8

    /// Fetches the media for `categories`, walking pages until every title in
    /// `wantedTitles` has been seen (or the category runs out).
    ///
    /// A single 100-item page is not enough: categories are sorted by title and
    /// run to several hundred entries, so one page only ever covers the start of
    /// the alphabet — "animals" returned Aardvark…Catterpillar, leaving 10 of the
    /// 12 default Animals cards permanently without a picture.
    func fetchMedia(
        for categories: [String],
        limit: Int = 100,
        wantedTitles: Set<String> = []
    ) async throws -> [TikoMediaItem] {
        var merged: [TikoMediaItem] = []
        var seen = Set<String>()
        var stillWanted = Set(wantedTitles.map { Self.normalizeTitle($0) })

        for category in categories {
            for page in 1...Self.maxPages {
                let items = try await fetchMedia(category: category, limit: limit, page: page)
                for item in items where !seen.contains(item.id) {
                    seen.insert(item.id)
                    merged.append(item)
                    stillWanted.remove(Self.normalizeTitle(item.title))
                    stillWanted.remove(Self.normalizeTitle(item.name))
                }
                // Short page means the category is exhausted.
                if items.count < limit { break }
                // Everything the caller asked for has been found.
                if !wantedTitles.isEmpty && stillWanted.isEmpty { break }
            }
            if !wantedTitles.isEmpty && stillWanted.isEmpty { break }
        }

        return merged
    }

    private static func normalizeTitle(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private func fetchMedia(category: String, limit: Int, page: Int) async throws -> [TikoMediaItem] {
        let listURL = baseURL.appending(path: "media")
        var components = URLComponents(url: listURL, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "type", value: "image"),
            URLQueryItem(name: "category", value: category),
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "page", value: String(page)),
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

        return (updates, mediaItems.first.map { resizedCDNURL($0.originalURL) })
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
