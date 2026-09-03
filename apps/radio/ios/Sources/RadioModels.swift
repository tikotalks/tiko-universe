import Foundation

struct RadioTrack: Identifiable, Codable, Equatable, Sendable {
    let id: String
    let title: String
    let artist: String?
    let source: TrackSource
    let youtubeVideoId: String?
    let audioUrl: String?
    let thumbnailUrl: String?
    let duration: TimeInterval?
    let categoryId: String?
    let addedAt: String?
    /// Track id inside the streaming service (Spotify track id, Apple Music song id).
    let externalId: String?
    /// Canonical web URL of the track on the streaming service.
    let externalUrl: String?

    init(
        id: String = UUID().uuidString,
        title: String,
        artist: String? = nil,
        source: TrackSource,
        youtubeVideoId: String? = nil,
        audioUrl: String? = nil,
        thumbnailUrl: String? = nil,
        duration: TimeInterval? = nil,
        categoryId: String? = nil,
        addedAt: String? = nil,
        externalId: String? = nil,
        externalUrl: String? = nil
    ) {
        self.id = id
        self.title = title
        self.artist = artist
        self.source = source
        self.youtubeVideoId = youtubeVideoId
        self.audioUrl = audioUrl
        self.thumbnailUrl = thumbnailUrl
        self.duration = duration
        self.categoryId = categoryId
        self.addedAt = addedAt ?? ISO8601DateFormatter().string(from: Date())
        self.externalId = externalId
        self.externalUrl = externalUrl
    }
}

extension RadioTrack {
    func withCategory(_ categoryId: String?) -> RadioTrack {
        RadioTrack(
            id: id,
            title: title,
            artist: artist,
            source: source,
            youtubeVideoId: youtubeVideoId,
            audioUrl: audioUrl,
            thumbnailUrl: thumbnailUrl,
            duration: duration,
            categoryId: categoryId,
            addedAt: addedAt,
            externalId: externalId,
            externalUrl: externalUrl
        )
    }

    /// Songs that live inside a linked streaming subscription. iOS hands these
    /// to the service's own app instead of playing them itself, because their
    /// audio is licensed to that player.
    var playsInStreamingService: Bool {
        source == .spotify || source == .appleMusic
    }
}

enum TrackSource: String, Codable, Equatable, Sendable {
    case youtube
    case r2
    case upload
    case spotify
    case appleMusic = "apple-music"
}

struct RadioCategory: Identifiable, Codable, Equatable, Sendable {
    let id: String
    var title: String
    var symbol: String
    var color: String
    /// Tiko Media artwork for the tile. Tiko Media leads the visual language
    /// across Tiko apps, so `symbol` is only the fallback while the image
    /// loads or when a user-made collection has no artwork yet.
    var imageURL: URL?

    var colorName: String { color }

    init(id: String, title: String, symbol: String, color: String, imageURL: URL? = nil) {
        self.id = id
        self.title = title
        self.symbol = symbol
        self.color = color
        self.imageURL = imageURL
    }
}

struct RadioLibrarySnapshot: Codable, Equatable, Sendable {
    var tracks: [RadioTrack]
    var categories: [RadioCategory]
    var selectedCategoryID: String?
}

enum YouTubeVideoIDParser {
    static func parse(_ input: String) -> String {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let components = URLComponents(string: trimmed),
              let host = components.host,
              host.contains("youtube.com") || host.contains("youtu.be") else {
            return trimmed
        }

        if host.contains("youtu.be") {
            return components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        }

        let pathParts = components.path.split(separator: "/").map(String.init)
        if let markerIndex = pathParts.firstIndex(where: { ["shorts", "embed", "live"].contains($0) }),
           pathParts.indices.contains(markerIndex + 1) {
            return pathParts[markerIndex + 1]
        }

        return components.queryItems?.first(where: { $0.name == "v" })?.value ?? trimmed
    }
}
