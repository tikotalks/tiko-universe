import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public struct TikoUser: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var displayName: String?
    public var email: String?
    public var emailVerified: Bool

    public init(id: String, displayName: String? = nil, email: String? = nil, emailVerified: Bool = false) {
        self.id = id
        self.displayName = displayName
        self.email = email
        self.emailVerified = emailVerified
    }

    public var isRecoverable: Bool {
        guard let email, !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        return emailVerified
    }
}

public enum TikoIdentityState: Equatable, Sendable {
    case loading
    case deviceUser(TikoUser)
    case recoverableUser(TikoUser)
    case signedOutDeviceUser(TikoUser)
    case error(String)

    public var user: TikoUser? {
        switch self {
        case .deviceUser(let user), .recoverableUser(let user), .signedOutDeviceUser(let user):
            user
        case .loading, .error:
            nil
        }
    }

    public static func from(user: TikoUser) -> TikoIdentityState {
        user.isRecoverable ? .recoverableUser(user) : .deviceUser(user)
    }
}

public struct TikoIdentityDevice: Codable, Equatable, Sendable {
    public let id: String

    public init(id: String) {
        self.id = id
    }
}

public struct TikoIdentitySessionTokens: Codable, Equatable, Sendable {
    public let accessToken: String
    public let refreshToken: String?

    public init(accessToken: String, refreshToken: String? = nil) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
    }
}

public struct TikoIdentitySession: Codable, Equatable, Sendable {
    public let user: TikoUser
    public let device: TikoIdentityDevice
    public let session: TikoIdentitySessionTokens

    public init(user: TikoUser, device: TikoIdentityDevice, session: TikoIdentitySessionTokens) {
        self.user = user
        self.device = device
        self.session = session
    }
}

public enum TikoIdentityClientError: Error, Equatable, Sendable {
    case missingAccessToken
    case invalidResponse
    case server(statusCode: Int, body: String)
}

public actor TikoIdentityClient {
    private let baseURL: URL
    private let urlSession: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    public init(baseURL: URL = URL(string: "https://id.tiko.mt")!, urlSession: URLSession = .shared) {
        self.baseURL = baseURL
        self.urlSession = urlSession
    }

    public func bootstrapDevice(deviceName: String, platform: String = "ios", app: String) async throws -> TikoIdentitySession {
        let body = BootstrapDeviceRequest(deviceName: deviceName, platform: platform, app: app)
        return try await send(path: "/api/identity/device", method: "POST", body: body, accessToken: nil)
    }

    public func updateProfile(name: String?, accessToken: String) async throws -> TikoUser {
        let response: ProfileResponse = try await send(
            path: "/api/identity/profile",
            method: "PATCH",
            body: UpdateProfileRequest(displayName: name),
            accessToken: accessToken
        )
        return response.user
    }

    public func requestMagicLink(name: String?, email: String, redirectURL: String, accessToken: String) async throws {
        let body = EmailRequest(email: email, displayName: name, redirectURL: redirectURL)
        let _: EmptyOKResponse = try await send(path: "/api/identity/email", method: "POST", body: body, accessToken: accessToken)
    }

    public func recoverAccount(email: String, redirectURL: String) async throws {
        let body = RecoverRequest(email: email, redirectURL: redirectURL)
        let _: EmptyOKResponse = try await send(path: "/api/identity/recover", method: "POST", body: body, accessToken: nil)
    }

    public func verifyMagicLink(token: String) async throws -> TikoIdentitySession {
        try await send(path: "/api/identity/verify-magic-link", method: "POST", body: VerifyMagicLinkRequest(token: token), accessToken: nil)
    }

    public func revokeCurrentSession(accessToken: String) async throws {
        let _: EmptyOKResponse = try await send(path: "/api/identity/session", method: "DELETE", body: Optional<String>.none, accessToken: accessToken)
    }

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
        guard let httpResponse = response as? HTTPURLResponse else {
            throw TikoIdentityClientError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw TikoIdentityClientError.server(statusCode: httpResponse.statusCode, body: String(data: data, encoding: .utf8) ?? "")
        }
        if Response.self == EmptyOKResponse.self, data.isEmpty {
            return EmptyOKResponse(ok: true) as! Response
        }
        return try decoder.decode(Response.self, from: data)
    }
}

public final class TikoDeviceSessionStore: @unchecked Sendable {
    private let defaults: UserDefaults
    private let sessionKey: String

    public init(defaults: UserDefaults = .standard, namespace: String = "tiko") {
        self.defaults = defaults
        self.sessionKey = "\(namespace).identitySession"
    }

    public func load() -> TikoIdentitySession? {
        guard let data = defaults.data(forKey: sessionKey) else { return nil }
        return try? JSONDecoder().decode(TikoIdentitySession.self, from: data)
    }

    public func save(_ session: TikoIdentitySession) {
        let data = try? JSONEncoder().encode(session)
        defaults.set(data, forKey: sessionKey)
    }

    public func clear() {
        defaults.removeObject(forKey: sessionKey)
    }
}

private struct BootstrapDeviceRequest: Encodable {
    let deviceName: String
    let platform: String
    let app: String
}

private struct UpdateProfileRequest: Encodable {
    let displayName: String?
}

private struct EmailRequest: Encodable {
    let email: String
    let displayName: String?
    let redirectURL: String
}

private struct RecoverRequest: Encodable {
    let email: String
    let redirectURL: String
}

private struct VerifyMagicLinkRequest: Encodable {
    let token: String
}

private struct ProfileResponse: Decodable {
    let user: TikoUser
}

private struct EmptyOKResponse: Codable {
    let ok: Bool
}
