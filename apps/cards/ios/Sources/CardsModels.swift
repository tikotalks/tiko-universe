import Foundation

struct CardCollection: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var title: String
    var colorHex: UInt32
    var order: Int
    var parentID: String?
    var mediaCategories: [String]
    var imageURL: URL?
    var cards: [CommunicationCard]

    init(
        id: String,
        title: String,
        colorHex: UInt32,
        order: Int,
        parentID: String? = nil,
        mediaCategories: [String] = [],
        imageURL: URL? = nil,
        cards: [CommunicationCard]
    ) {
        self.id = id
        self.title = title
        self.colorHex = colorHex
        self.order = order
        self.parentID = parentID
        self.mediaCategories = mediaCategories
        self.imageURL = imageURL
        self.cards = cards
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        colorHex = try container.decode(UInt32.self, forKey: .colorHex)
        order = try container.decode(Int.self, forKey: .order)
        parentID = try container.decodeIfPresent(String.self, forKey: .parentID)
        mediaCategories = try container.decodeIfPresent([String].self, forKey: .mediaCategories) ?? []
        imageURL = try container.decodeIfPresent(URL.self, forKey: .imageURL)
        cards = try container.decodeIfPresent([CommunicationCard].self, forKey: .cards) ?? []
    }
}

struct CommunicationCard: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var title: String
    var speech: String
    var imageURL: URL?
    var imageRef: String?
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
