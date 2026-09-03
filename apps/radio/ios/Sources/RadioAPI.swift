import Foundation

// ────────────────────────────────────────────────────────────────
// Everything Radio asks the media API for: YouTube search, streaming-service
// share links, and shared collections. Keys and third-party endpoints stay
// server-side; the app only ever talks to Tiko.
// ────────────────────────────────────────────────────────────────

struct RadioYouTubeResult: Codable, Equatable, Identifiable, Sendable {
    let videoId: String
    let title: String
    var channelTitle: String?
    var thumbnailUrl: String?
    var durationSeconds: Double?

    var id: String { videoId }

    var artworkURL: URL? {
        URL(string: thumbnailUrl ?? "https://img.youtube.com/vi/\(videoId)/hqdefault.jpg")
    }

    /// A track ready for the library, once a collection has been chosen.
    func track(categoryID: String) -> RadioTrack {
        RadioTrack(
            title: title,
            artist: channelTitle?.isEmpty == false ? channelTitle : nil,
            source: .youtube,
            youtubeVideoId: videoId,
            thumbnailUrl: thumbnailUrl ?? "https://img.youtube.com/vi/\(videoId)/hqdefault.jpg",
            duration: durationSeconds,
            categoryId: categoryID
        )
    }

    var durationLabel: String? {
        guard let durationSeconds, durationSeconds > 0 else { return nil }
        let total = Int(durationSeconds)
        return String(format: "%d:%02d", total / 60, total % 60)
    }
}

struct RadioResolvedLink: Codable, Equatable, Sendable {
    let provider: RadioServiceProvider
    let externalId: String
    let externalUrl: String
    let title: String
    var artist: String?
    var thumbnailUrl: String?
    var durationSeconds: Double?

    func track(categoryID: String) -> RadioTrack {
        RadioTrack(
            title: title,
            artist: artist,
            source: provider.trackSource,
            thumbnailUrl: thumbnailUrl,
            duration: durationSeconds,
            categoryId: categoryID,
            externalId: externalId,
            externalUrl: externalUrl
        )
    }
}

enum RadioAPIError: LocalizedError, Equatable {
    case notConfigured
    case notFound
    case message(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured: return "This is not available right now."
        case .notFound: return "Nothing was found."
        case .message(let text): return text
        }
    }
}

/// Reads the `{ data, meta }` / `{ error: { code, message } }` envelope the
/// Tiko workers answer with.
private struct RadioEnvelope<Payload: Decodable>: Decodable {
    struct APIError: Decodable {
        let code: String?
        let message: String?
    }

    let data: Payload?
    let error: APIError?
    let meta: Meta?

    struct Meta: Decodable {
        let skippedSongs: Int?
    }
}

struct RadioPublishResult: Equatable, Sendable {
    let collection: RadioSharedCollection
    /// Songs left out because they only exist on this device.
    let skippedSongs: Int
}

actor RadioAPI {
    static let shared = RadioAPI()

    private let baseURL: URL
    private let session: URLSession

    init(baseURL: URL = URL(string: "https://media.tikoapi.org/v1")!, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    // ── YouTube ─────────────────────────────────────────────────

    func searchYouTube(query: String, limit: Int = 12) async throws -> [RadioYouTubeResult] {
        let cleaned = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return [] }
        var components = URLComponents(url: baseURL.appending(path: "youtube/search"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "q", value: cleaned),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        return try await get(components.url!)
    }

    func channelVideos(channelId: String, limit: Int = 8) async throws -> [RadioYouTubeResult] {
        var components = URLComponents(url: baseURL.appending(path: "youtube/search"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "channelId", value: channelId),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        return try await get(components.url!)
    }

    // ── Streaming service links ─────────────────────────────────

    func resolveMusicLink(_ link: String) async throws -> RadioResolvedLink {
        var components = URLComponents(url: baseURL.appending(path: "music/resolve"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "url", value: link.trimmingCharacters(in: .whitespacesAndNewlines))]
        return try await get(components.url!)
    }

    // ── Shared collections ──────────────────────────────────────

    func featuredCollections() async throws -> [RadioSharedCollection] {
        try await get(baseURL.appending(path: "radio/collections"))
    }

    func sharedCollection(code: String) async throws -> RadioSharedCollection {
        guard let normalized = RadioShareCode.normalize(code) else { throw RadioAPIError.notFound }
        return try await get(baseURL.appending(path: "radio/collections/\(normalized)"))
    }

    /// Publish a collection, or republish the one already shared under `code`,
    /// so a QR already handed out keeps working.
    func publish(
        name: String,
        color: String,
        imageUrl: String?,
        songs: [RadioSharedSong],
        existingCode: String?,
        sessionToken: String
    ) async throws -> RadioPublishResult {
        var body: [String: Any] = ["name": name, "color": color, "songs": songs.map(Self.encode)]
        if let imageUrl { body["imageUrl"] = imageUrl }

        let payload = try JSONSerialization.data(withJSONObject: body)

        if let existingCode {
            let url = baseURL.appending(path: "radio/collections/\(existingCode)")
            if let republished = try? await send(url, method: "PUT", body: payload, sessionToken: sessionToken) {
                return republished
            }
            // The share is gone (someone removed it): make a new one rather than
            // leaving the parent with a screen full of nothing.
        }

        return try await send(baseURL.appending(path: "radio/collections"), method: "POST", body: payload, sessionToken: sessionToken)
    }

    // ── Transport ───────────────────────────────────────────────

    private func get<Payload: Decodable>(_ url: URL) async throws -> Payload {
        let (data, response) = try await session.data(from: url)
        return try Self.decode(data: data, response: response)
    }

    private func send(_ url: URL, method: String, body: Data, sessionToken: String) async throws -> RadioPublishResult {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        if !sessionToken.isEmpty {
            request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "authorization")
        }

        let (data, response) = try await session.data(for: request)
        let envelope = try JSONDecoder().decode(RadioEnvelope<RadioSharedCollection>.self, from: data)
        if let status = (response as? HTTPURLResponse)?.statusCode, status >= 400 {
            throw Self.error(from: envelope, status: status)
        }
        guard let collection = envelope.data else { throw RadioAPIError.notFound }
        return RadioPublishResult(collection: collection, skippedSongs: envelope.meta?.skippedSongs ?? 0)
    }

    private static func decode<Payload: Decodable>(data: Data, response: URLResponse) throws -> Payload {
        let envelope = try JSONDecoder().decode(RadioEnvelope<Payload>.self, from: data)
        if let status = (response as? HTTPURLResponse)?.statusCode, status >= 400 {
            throw error(from: envelope, status: status)
        }
        guard let payload = envelope.data else { throw RadioAPIError.notFound }
        return payload
    }

    private static func error<Payload: Decodable>(from envelope: RadioEnvelope<Payload>, status: Int) -> RadioAPIError {
        if envelope.error?.code == "youtube_not_configured" { return .notConfigured }
        if status == 404 { return .notFound }
        if let message = envelope.error?.message, !message.isEmpty { return .message(message) }
        return .notFound
    }

    private static func encode(_ song: RadioSharedSong) -> [String: Any] {
        var payload: [String: Any] = ["title": song.title, "source": song.source]
        if let artist = song.artist { payload["artist"] = artist }
        if let videoId = song.youtubeVideoId { payload["youtubeVideoId"] = videoId }
        if let audioUrl = song.audioUrl { payload["audioUrl"] = audioUrl }
        if let externalId = song.externalId { payload["externalId"] = externalId }
        if let externalUrl = song.externalUrl { payload["externalUrl"] = externalUrl }
        if let thumbnailUrl = song.thumbnailUrl { payload["thumbnailUrl"] = thumbnailUrl }
        if let duration = song.duration { payload["duration"] = duration }
        return payload
    }
}
