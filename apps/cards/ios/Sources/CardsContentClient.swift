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

    /// Fetches collections from the Content API.
    /// Passes the session token so the API can merge user-specific data.
    /// Throws on network or decode failure — callers should fall back to defaults.
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
}
