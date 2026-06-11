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
        addedAt: String? = nil
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
            addedAt: addedAt
        )
    }
}

enum TrackSource: String, Codable, Equatable, Sendable {
    case youtube
    case r2
    case upload
}

struct RadioCategory: Identifiable, Codable, Equatable, Sendable {
    let id: String
    var title: String
    var symbol: String
    var color: String

    var colorName: String { color }
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
