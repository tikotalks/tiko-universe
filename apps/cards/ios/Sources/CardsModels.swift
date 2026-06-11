import Foundation
import TikoKit

struct CardCollection: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var title: String
    var color: String
    var order: Int
    var parentID: String?
    var mediaCategories: [String]
    var imageRef: String?
    var imageURL: URL?
    var cards: [CommunicationCard]

    init(
        id: String,
        title: String,
        color: String,
        order: Int,
        parentID: String? = nil,
        mediaCategories: [String] = [],
        imageRef: String? = nil,
        imageURL: URL? = nil,
        cards: [CommunicationCard]
    ) {
        self.id = id
        self.title = title
        self.color = cardsColorName(color, fallback: "orange")
        self.order = order
        self.parentID = parentID
        self.mediaCategories = mediaCategories
        self.imageRef = imageRef
        self.imageURL = imageURL
        self.cards = cards
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        color = cardsColorName(try container.decode(String.self, forKey: .color), fallback: "orange")
        order = try container.decode(Int.self, forKey: .order)
        parentID = try container.decodeIfPresent(String.self, forKey: .parentID)
        mediaCategories = try container.decodeIfPresent([String].self, forKey: .mediaCategories) ?? []
        imageRef = try container.decodeIfPresent(String.self, forKey: .imageRef)
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
    var color: String

    init(id: String, title: String, speech: String, imageURL: URL? = nil, imageRef: String? = nil, color: String) {
        self.id = id
        self.title = title
        self.speech = speech
        self.imageURL = imageURL
        self.imageRef = imageRef
        self.color = cardsColorName(color, fallback: "orange")
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        speech = try container.decode(String.self, forKey: .speech)
        imageURL = try container.decodeIfPresent(URL.self, forKey: .imageURL)
        imageRef = try container.decodeIfPresent(String.self, forKey: .imageRef)
        color = cardsColorName(try container.decode(String.self, forKey: .color), fallback: "orange")
    }
}

private func cardsColorName(_ value: String, fallback: String) -> String {
    TikoColors.named(value) != nil ? value : fallback
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
