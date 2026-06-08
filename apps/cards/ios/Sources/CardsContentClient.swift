import Foundation
import TikoKit

actor CardsContentClient {
    static let baseURL = "https://content.tikoapi.org/v1"

    private struct APIResponse: Decodable {
        let success: Bool
        let data: DataPayload

        struct DataPayload: Decodable {
            let collections: [CardCollection]
        }
    }

    private struct SingleCollectionResponse: Decodable {
        let success: Bool
        let data: CardCollection
    }

    private struct SingleCardResponse: Decodable {
        let success: Bool
        let data: CommunicationCard
    }

    /// Fetches collections from the Content API.
    /// Passes the session token so the API can merge user-specific data.
    func fetchCollections(sessionToken: String?) async throws -> [CardCollection] {
        guard let url = URL(string: "\(Self.baseURL)/cards/collections") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.timeoutInterval = 15
        if let token = sessionToken, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(APIResponse.self, from: data).data.collections
    }

    /// Creates a new user collection and persists it server-side.
    func createCollection(id: String, title: String, colorHex: UInt32, order: Int, sessionToken: String) async throws -> CardCollection {
        guard let url = URL(string: "\(Self.baseURL)/cards/collections") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let payload: [String: Any] = ["id": id, "title": title, "colorHex": colorHex, "order": order]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(SingleCollectionResponse.self, from: data).data
    }

    /// Adds a card to a user collection and persists it server-side.
    func createCard(id: String, title: String, speech: String, colorHex: UInt32, order: Int, collectionID: String, sessionToken: String) async throws -> CommunicationCard {
        guard let url = URL(string: "\(Self.baseURL)/cards/collections/\(collectionID)/cards") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let payload: [String: Any] = ["id": id, "title": title, "speech": speech, "colorHex": colorHex, "order": order]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(SingleCardResponse.self, from: data).data
    }
}
