import Foundation

// MARK: - Media API models (same wire shapes as the other Tiko apps)

public struct TikoMediaListResponse: Decodable, Sendable {
    public let data: [TikoMediaItem]
}

public struct TikoMediaItem: Decodable, Identifiable, Sendable {
    public let id: String
    public let fileName: String
    public let title: String
    public let tags: [String]
    public let originalURL: URL

    enum CodingKeys: String, CodingKey {
        case id
        case fileName = "file_name"
        case title
        case tags
        case originalURL = "original_url"
    }

    public var name: String {
        fileName.replacingOccurrences(of: #"\.[^.]+$"#, with: "", options: .regularExpression)
    }
}

// MARK: - Client

public actor TikoMediaClient {
    private let baseURL: URL
    private let session: URLSession

    public init(baseURL: URL = URL(string: "https://media.tikoapi.org/v1")!, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    public func fetchMedia(for categories: [String], limit: Int = 100) async throws -> [TikoMediaItem] {
        var merged: [TikoMediaItem] = []
        var seen = Set<String>()
        for category in categories {
            guard let items = try? await fetchMedia(category: category, limit: limit) else { continue }
            for item in items where !seen.contains(item.id) {
                seen.insert(item.id)
                merged.append(item)
            }
        }
        return merged
    }

    /// Searches the library by free text. Routine-style content (a toothbrush,
    /// a lunch box, a bus stop) lives across many folders rather than in one
    /// category, so apps like First resolve each image by its English key.
    public func searchMedia(query: String, limit: Int = 8) async throws -> [TikoMediaItem] {
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
        var components = URLComponents(url: baseURL.appending(path: "media"), resolvingAgainstBaseURL: false)!
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

// MARK: - Matcher

/// Matches library images to default cards by their English media key
/// (the library is titled/tagged in English), exact name first, then tags.
public enum TikoMediaMatcher {
    public static func match(cards: [(cardID: String, matchKey: String)], mediaItems: [TikoMediaItem]) -> [String: URL] {
        var results: [String: URL] = [:]
        var usedURLs = Set<URL>()
        var mediaByName: [String: TikoMediaItem] = [:]
        for item in mediaItems {
            mediaByName[normalize(item.name)] = item
            mediaByName[normalize(item.title)] = item
        }

        for card in cards {
            if let item = mediaByName[normalize(card.matchKey)] {
                results[card.cardID] = resizedCDNURL(item.originalURL)
                usedURLs.insert(item.originalURL)
            }
        }

        for card in cards where results[card.cardID] == nil {
            let cardWords = Set(words(card.matchKey))
            guard !cardWords.isEmpty else { continue }
            if let item = mediaItems.first(where: { item in
                guard !usedURLs.contains(item.originalURL) else { return false }
                let tagMatch = item.tags.contains { words($0).contains { cardWords.contains($0) } }
                let nameMatch = words(item.name).contains { cardWords.contains($0) }
                return tagMatch || nameMatch
            }) {
                results[card.cardID] = resizedCDNURL(item.originalURL)
                usedURLs.insert(item.originalURL)
            }
        }

        return results
    }

    public static func resizedCDNURL(_ originalURL: URL) -> URL {
        TikoImageURL.resized(originalURL, width: 600, quality: 80)
    }

    public static func normalize(_ value: String) -> String {
        value.lowercased()
            .replacingOccurrences(of: #"\.[^.]+$"#, with: "", options: .regularExpression)
            .replacingOccurrences(of: #"[^a-z0-9]+"#, with: "_", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "_"))
    }

    private static func words(_ value: String) -> [String] {
        normalize(value).split(separator: "_").map(String.init).filter { !$0.isEmpty }
    }
}
