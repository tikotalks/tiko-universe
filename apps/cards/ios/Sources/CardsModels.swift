import Foundation

struct CardCollection: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var title: String
    var colorHex: UInt32
    var order: Int
    var cards: [CommunicationCard]
}

struct CommunicationCard: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var title: String
    var speech: String
    var imageURL: URL?
    var colorHex: UInt32
}

struct TikoMediaListResponse: Decodable, Sendable {
    let data: [TikoMediaItem]
}

struct TikoMediaItem: Decodable, Identifiable, Sendable {
    let id: String
    let fileName: String
    let title: String
    let folder: String?
    let tags: [String]
    let originalURL: URL

    enum CodingKeys: String, CodingKey {
        case id
        case fileName = "file_name"
        case title
        case folder
        case tags
        case originalURL = "original_url"
    }

    var name: String {
        fileName.replacingOccurrences(of: #"\.[^.]+$"#, with: "", options: .regularExpression)
    }
}
