import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

// MARK: - Types

public struct TikoUser: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var displayName: String?
    public let kind: String
    public let recoverable: Bool

    public var isRecoverable: Bool { recoverable }

    public init(id: String, displayName: String? = nil, kind: String = "device", recoverable: Bool = false) {
        self.id = id
        self.displayName = displayName
        self.kind = kind
        self.recoverable = recoverable
    }
}

public struct TikoIdentityDevice: Codable, Equatable, Sendable {
    public let id: String
    public var name: String?
    public var secret: String?

    public init(id: String, name: String? = nil, secret: String? = nil) {
        self.id = id
        self.name = name
        self.secret = secret
    }
}

public struct TikoIdentitySessionTokens: Codable, Equatable, Sendable {
    public let token: String
    public let expiresAt: String

    public init(token: String, expiresAt: String) {
        self.token = token
        self.expiresAt = expiresAt
    }
}

public struct TikoIdentityBundle: Codable, Equatable, Sendable {
    public let user: TikoUser
    public let device: TikoIdentityDevice
    public let session: TikoIdentitySessionTokens

    public var accessToken: String { session.token }

    public init(user: TikoUser, device: TikoIdentityDevice, session: TikoIdentitySessionTokens) {
        self.user = user
        self.device = device
        self.session = session
    }
}

public enum TikoIdentityState: Equatable, Sendable {
    case loading
    case deviceUser(TikoUser)
    case recoverableUser(TikoUser)
    case error(String)

    public var user: TikoUser? {
        switch self {
        case .deviceUser(let u), .recoverableUser(let u): u
        case .loading, .error: nil
        }
    }

    public static func from(user: TikoUser) -> TikoIdentityState {
        user.isRecoverable ? .recoverableUser(user) : .deviceUser(user)
    }
}

public enum TikoIdentityClientError: Error, Equatable, Sendable {
    case invalidResponse
    case server(statusCode: Int, body: String)
}

// MARK: - Client

public actor TikoIdentityClient {
    /// Base URL for the identity API. Set once at app startup.
    /// Defaults to the production Tiko identity worker.
    public static var identityBaseURL: String = "https://identity.tikoapi.org/v1"

    private let baseURL: URL
    private let urlSession: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    public init(baseURL: URL? = nil, urlSession: URLSession = .shared) {
        let resolved = baseURL ?? URL(string: TikoIdentityClient.identityBaseURL) ?? URL(string: "https://identity.tikoapi.org/v1")!
        self.baseURL = resolved
        self.urlSession = urlSession
    }

    // MARK: - Device bootstrap

    public func bootstrapDevice(id: String? = nil, secret: String? = nil, name: String? = nil, platform: String = "ios") async throws -> TikoIdentityBundle {
        let body = BootstrapDeviceRequest(device: .init(id: id, secret: secret, name: name, platform: platform))
        return try await send(path: "/identity/device", method: "POST", body: body, accessToken: nil)
    }

    // MARK: - Session

    public func getSession(accessToken: String) async throws -> TikoIdentityBundle {
        try await send(path: "/identity/session", method: "GET", body: Optional<String>.none, accessToken: accessToken)
    }

    // MARK: - Recovery email

    public func requestRecoveryEmail(email: String, accessToken: String? = nil) async throws {
        let body = RecoveryEmailRequest(email: email)
        let _: RecoveryEmailResponse = try await send(path: "/identity/email", method: "POST", body: body, accessToken: accessToken)
    }

    // MARK: - Magic link / OTP verification

    public func verifyMagicLink(token: String) async throws -> TikoIdentityBundle {
        try await send(path: "/identity/magic-links/verify", method: "POST", body: VerifyRequest(token: token, otp: nil), accessToken: nil)
    }

    public func verifyOtp(otp: String) async throws -> TikoIdentityBundle {
        let sanitized = otp.filter(\.isNumber)
        return try await send(path: "/identity/magic-links/verify", method: "POST", body: VerifyRequest(token: nil, otp: sanitized), accessToken: nil)
    }

    // MARK: - Logout

    public func logout(accessToken: String) async throws {
        let _: EmptyResponse = try await send(path: "/identity/logout", method: "POST", body: Optional<String>.none, accessToken: accessToken)
    }

    // MARK: - Private

    private func send<Response: Decodable, Body: Encodable>(path: String, method: String, body: Body, accessToken: String?) async throws -> Response {
        let url = baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        if !(body is Optional<String>) {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try encoder.encode(body)
        }

        let (data, response) = try await urlSession.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw TikoIdentityClientError.invalidResponse
        }
        if http.statusCode == 204 {
            return EmptyResponse() as! Response
        }
        guard (200..<300).contains(http.statusCode) else {
            throw TikoIdentityClientError.server(statusCode: http.statusCode, body: String(data: data, encoding: .utf8) ?? "")
        }
        return try decoder.decode(Response.self, from: data)
    }
}

// MARK: - Session store

public final class TikoDeviceSessionStore: @unchecked Sendable {
    private let defaults: UserDefaults
    private let sessionKey: String

    public init(defaults: UserDefaults = .standard, namespace: String = "tiko") {
        self.defaults = defaults
        self.sessionKey = "\(namespace).identityBundle"
    }

    public func load() -> TikoIdentityBundle? {
        guard let data = defaults.data(forKey: sessionKey) else { return nil }
        return try? JSONDecoder().decode(TikoIdentityBundle.self, from: data)
    }

    public func save(_ bundle: TikoIdentityBundle) {
        let data = try? JSONEncoder().encode(bundle)
        defaults.set(data, forKey: sessionKey)
    }

    public func clear() {
        defaults.removeObject(forKey: sessionKey)
    }
}

// MARK: - Request / response types

private struct BootstrapDeviceRequest: Encodable {
    let device: DeviceInput

    struct DeviceInput: Encodable {
        let id: String?
        let secret: String?
        let name: String?
        let platform: String?
    }
}

private struct RecoveryEmailRequest: Encodable {
    let email: String
}

private struct RecoveryEmailResponse: Decodable {
    let message: String?
}

private struct VerifyRequest: Encodable {
    let token: String?
    let otp: String?
}

private struct EmptyResponse: Codable {}
