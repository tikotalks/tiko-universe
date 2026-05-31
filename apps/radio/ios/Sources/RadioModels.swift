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
        self.addedAt = addedAt ?? ISO8601DateFormatter().string(from: Date())
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
    var colorHex: UInt32
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

        return components.queryItems?.first(where: { $0.name == "v" })?.value ?? trimmed
    }
}
