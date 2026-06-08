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
    func createCollection(id: String, title: String, colorHex: UInt32, order: Int, imageURL: URL? = nil, sessionToken: String) async throws -> CardCollection {
        guard let url = URL(string: "\(Self.baseURL)/cards/collections") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var payload: [String: Any] = ["id": id, "title": title, "colorHex": colorHex, "order": order]
        if let imageURL, !imageURL.isFileURL { payload["imageURL"] = imageURL.absoluteString }
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(SingleCollectionResponse.self, from: data).data
    }

    /// Adds a card to a user collection and persists it server-side.
    func createCard(id: String, title: String, speech: String, colorHex: UInt32, order: Int, imageURL: URL? = nil, collectionID: String, sessionToken: String) async throws -> CommunicationCard {
        guard let url = URL(string: "\(Self.baseURL)/cards/collections/\(collectionID)/cards") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var payload: [String: Any] = ["id": id, "title": title, "speech": speech, "colorHex": colorHex, "order": order]
        if let imageURL, !imageURL.isFileURL { payload["imageURL"] = imageURL.absoluteString }
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(SingleCardResponse.self, from: data).data
    }

    func updateCollection(id: String, title: String, colorHex: UInt32, imageURL: URL? = nil, sessionToken: String) async throws -> CardCollection {
        guard let url = URL(string: "\(Self.baseURL)/cards/collections/\(id)") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.timeoutInterval = 15
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var payload: [String: Any] = ["title": title, "colorHex": colorHex]
        if let imageURL, !imageURL.isFileURL { payload["imageURL"] = imageURL.absoluteString }
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(SingleCollectionResponse.self, from: data).data
    }

    func updateCard(id: String, title: String, speech: String, colorHex: UInt32, imageURL: URL? = nil, collectionID: String, sessionToken: String) async throws -> CommunicationCard {
        guard let url = URL(string: "\(Self.baseURL)/cards/collections/\(collectionID)/cards/\(id)") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.timeoutInterval = 15
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var payload: [String: Any] = ["title": title, "speech": speech, "colorHex": colorHex]
        if let imageURL, !imageURL.isFileURL { payload["imageURL"] = imageURL.absoluteString }
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(SingleCardResponse.self, from: data).data
    }

    func deleteCollection(id: String, sessionToken: String) async throws {
        guard let url = URL(string: "\(Self.baseURL)/cards/collections/\(id)") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.timeoutInterval = 15
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }

    func deleteCard(id: String, collectionID: String, sessionToken: String) async throws {
        guard let url = URL(string: "\(Self.baseURL)/cards/collections/\(collectionID)/cards/\(id)") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.timeoutInterval = 15
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }

    func promoteCollection(_ collection: CardCollection, sessionToken: String) async throws {
        guard let url = URL(string: "\(Self.baseURL)/admin/cards/promote") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let payload: [String: Any] = [
            "collection": [
                "id": collection.id,
                "title": collection.title,
                "colorHex": collection.colorHex,
                "order": collection.order,
                "cards": collection.cards.map { [
                    "id": $0.id,
                    "title": $0.title,
                    "speech": $0.speech,
                    "colorHex": $0.colorHex,
                    "order": 0
                ] }
            ]
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }
}
