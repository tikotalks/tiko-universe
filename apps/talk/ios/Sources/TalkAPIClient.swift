import Foundation

protocol TalkSentenceAPI: Sendable {
    func start(locale: String, userId: String?, sessionToken: String?) async throws -> TalkSentenceStartResponse
    func next(currentWords: [String], locale: String, userId: String?, sessionToken: String?) async throws -> TalkSentenceNextResponse
    func complete(wordIds: [String], locale: String, autoSave: Bool, userId: String?, sessionToken: String?) async throws -> TalkSentenceCompleteResponse
    func vocabulary(locale: String, category: String?, pos: String?, sessionToken: String?) async throws -> TalkSentenceVocabularyResponse
    func phrases(locale: String, userId: String, sessionToken: String?) async throws -> TalkSentencePhrasesResponse
    func savePhrase(locale: String, userId: String, wordIds: [String], label: String?, sessionToken: String?) async throws -> TalkSaveSentencePhraseResponse
    func deletePhrase(phraseId: String, locale: String, userId: String, sessionToken: String?) async throws -> TalkDeleteSentencePhraseResponse
}

enum TalkAPIError: Error, Equatable, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpStatus(Int, String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            "Invalid Sentence API URL."
        case .invalidResponse:
            "Sentence API returned an invalid response."
        case .httpStatus(let status, let body):
            "Sentence API returned \(status): \(body)"
        }
    }
}

actor TalkAPIClient: TalkSentenceAPI {
    enum Environment: Sendable, Equatable {
        case development
        case production
        case custom(URL)

        var baseURL: URL {
            switch self {
            case .development:
                URL(string: "https://dev-api.tikotalks.com/v1/sentence")!
            case .production:
                URL(string: "https://api.tikotalks.com/v1/sentence")!
            case .custom(let url):
                url
            }
        }
    }

    private let environment: Environment
    private let session: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    static var defaultEnvironment: Environment {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }

    init(environment: Environment? = nil, session: URLSession = .shared) {
        self.environment = environment ?? Self.defaultEnvironment
        self.session = session
    }

    func start(locale: String, userId: String? = nil, sessionToken: String? = nil) async throws -> TalkSentenceStartResponse {
        var items = [URLQueryItem(name: "locale", value: locale)]
        if let userId, !userId.isEmpty {
            items.append(URLQueryItem(name: "userId", value: userId))
        }
        let request = try makeRequest(path: "start", method: "GET", queryItems: items, sessionToken: sessionToken)
        return try await send(request)
    }

    func next(currentWords: [String], locale: String, userId: String? = nil, sessionToken: String? = nil) async throws -> TalkSentenceNextResponse {
        let body = TalkSentenceNextRequest(locale: locale, userId: userId, currentWords: currentWords)
        let request = try makeJSONRequest(path: "next", body: body, sessionToken: sessionToken)
        return try await send(request)
    }

    func complete(wordIds: [String], locale: String, autoSave: Bool = true, userId: String? = nil, sessionToken: String? = nil) async throws -> TalkSentenceCompleteResponse {
        let body = TalkSentenceCompleteRequest(locale: locale, userId: userId, wordIds: wordIds, autoSave: autoSave)
        let request = try makeJSONRequest(path: "complete", body: body, sessionToken: sessionToken)
        return try await send(request)
    }

    func vocabulary(locale: String, category: String? = nil, pos: String? = nil, sessionToken: String? = nil) async throws -> TalkSentenceVocabularyResponse {
        var items = [URLQueryItem(name: "locale", value: locale)]
        if let category, !category.isEmpty {
            items.append(URLQueryItem(name: "category", value: category))
        }
        if let pos, !pos.isEmpty {
            items.append(URLQueryItem(name: "pos", value: pos))
        }
        let request = try makeRequest(path: "vocabulary", method: "GET", queryItems: items, sessionToken: sessionToken)
        return try await send(request)
    }

    func phrases(locale: String, userId: String, sessionToken: String? = nil) async throws -> TalkSentencePhrasesResponse {
        let items = [
            URLQueryItem(name: "locale", value: locale),
            URLQueryItem(name: "userId", value: userId)
        ]
        let request = try makeRequest(path: "phrases", method: "GET", queryItems: items, sessionToken: sessionToken)
        return try await send(request)
    }

    func savePhrase(locale: String, userId: String, wordIds: [String], label: String? = nil, sessionToken: String? = nil) async throws -> TalkSaveSentencePhraseResponse {
        let body = TalkSaveSentencePhraseRequest(locale: locale, userId: userId, wordIds: wordIds, label: label)
        let request = try makeJSONRequest(path: "phrases", body: body, sessionToken: sessionToken)
        return try await send(request)
    }

    func deletePhrase(phraseId: String, locale: String, userId: String, sessionToken: String? = nil) async throws -> TalkDeleteSentencePhraseResponse {
        let items = [
            URLQueryItem(name: "locale", value: locale),
            URLQueryItem(name: "userId", value: userId)
        ]
        let request = try makeRequest(path: "phrases/\(phraseId)", method: "DELETE", queryItems: items, sessionToken: sessionToken)
        return try await send(request)
    }

    private func makeJSONRequest<T: Encodable>(path: String, body: T, sessionToken: String?) throws -> URLRequest {
        var request = try makeRequest(path: path, method: "POST", sessionToken: sessionToken)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        return request
    }

    private func makeRequest(path: String, method: String, queryItems: [URLQueryItem] = [], sessionToken: String? = nil) throws -> URLRequest {
        let base = environment.baseURL.appendingPathComponent(path)
        guard var components = URLComponents(url: base, resolvingAgainstBaseURL: false) else {
            throw TalkAPIError.invalidURL
        }
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        guard let url = components.url else {
            throw TalkAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let sessionToken, !sessionToken.isEmpty {
            request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        }
        return request
    }

    private func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw TalkAPIError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw TalkAPIError.httpStatus(http.statusCode, body)
        }
        return try decoder.decode(T.self, from: data)
    }
}
