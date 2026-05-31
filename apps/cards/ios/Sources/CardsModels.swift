import Foundation

struct CardCollection: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var title: String
    var symbol: String
    var colorHex: UInt32
    var cards: [CommunicationCard]
}

struct CommunicationCard: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var title: String
    var speech: String
    var symbol: String?
    var imageDataIdentifier: String?
    var colorHex: UInt32
}
