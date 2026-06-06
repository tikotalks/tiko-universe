import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
#if canImport(Security)
import Security
#endif

// MARK: - Ankore-native identity types

public struct TikoIdentitySubject: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let kind: String
    public let product: String

    public init(id: String, kind: String = "anonymous", product: String = "tiko") {
        self.id = id
        self.kind = kind
        self.product = product
    }
}

public struct TikoIdentityDevice: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var name: String?
    public var secret: String?

    public init(id: String, name: String? = nil, secret: String? = nil) {
        self.id = id
        self.name = name
        self.secret = secret
    }
}

public struct TikoIdentityAccount: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let subjectId: String
    public let emailVerified: Bool
    public let email: String?

    public init(id: String, subjectId: String, emailVerified: Bool, email: String? = nil) {
        self.id = id
        self.subjectId = subjectId
        self.emailVerified = emailVerified
        self.email = email
    }
}

public struct TikoIdentitySession: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let token: String
    public let transport: String
    public let expiresAt: String

    public init(id: String, token: String, transport: String = "bearer", expiresAt: String) {
        self.id = id
        self.token = token
        self.transport = transport
        self.expiresAt = expiresAt
    }
}

public struct TikoIdentityBundle: Codable, Equatable, Sendable {
    public let subject: TikoIdentitySubject
    public let device: TikoIdentityDevice?
    public let account: TikoIdentityAccount?
    public let session: TikoIdentitySession?

    public var accessToken: String? { session?.token }
    public var isRecoverable: Bool { account?.emailVerified == true }

    public init(subject: TikoIdentitySubject, device: TikoIdentityDevice? = nil, account: TikoIdentityAccount? = nil, session: TikoIdentitySession? = nil) {
        self.subject = subject
        self.device = device
        self.account = account
        self.session = session
    }
}

public enum TikoIdentityState: Equatable, Sendable {
    case loading
    case deviceUser(TikoIdentityBundle)
    case recoverableUser(TikoIdentityBundle)
    case error(String)

    public var bundle: TikoIdentityBundle? {
        switch self {
        case .deviceUser(let bundle), .recoverableUser(let bundle): bundle
        case .loading, .error: nil
        }
    }

    public static func from(bundle: TikoIdentityBundle) -> TikoIdentityState {
        bundle.isRecoverable ? .recoverableUser(bundle) : .deviceUser(bundle)
    }
}

public enum TikoIdentityClientError: Error, Equatable, Sendable {
    case invalidResponse
    case server(statusCode: Int, body: String)
    case missingSessionToken
}

// MARK: - Profile

public struct TikoIdentityProfile: Codable, Sendable {
    public var parentCodeHash: String?
    public var displayName: String?

    public init(parentCodeHash: String? = nil, displayName: String? = nil) {
        self.parentCodeHash = parentCodeHash
        self.displayName = displayName
    }
}

private struct ProfileResponse: Codable {
    let profile: TikoIdentityProfile
}

// MARK: - Client

public actor TikoIdentityClient {
    /// Native clients use bearer sessions against the same Ankore identity service.
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

    public func bootstrapDevice(id: String? = nil, secret: String? = nil, name: String? = nil, platform: String = "ios") async throws -> TikoIdentityBundle {
        let body = BootstrapDeviceRequest(device: .init(id: id, secret: secret, name: name, platform: platform))
        return try await send(path: "/identity/device", method: "POST", body: body, accessToken: nil)
    }

    public func getSession(accessToken: String) async throws -> TikoIdentityBundle {
        try await send(path: "/identity/session", method: "GET", body: EmptyBody?.none, accessToken: accessToken)
    }

    public func refreshSession(accessToken: String) async throws -> TikoIdentityBundle {
        try await send(path: "/identity/session/refresh", method: "POST", body: EmptyBody?.none, accessToken: accessToken)
    }

    public func createEmailChallenge(email: String, purpose: String = "recover", accessToken: String? = nil) async throws {
        let body = EmailChallengeRequest(email: email, purpose: purpose)
        let _: EmailChallengeResponse = try await send(path: "/identity/email/challenge", method: "POST", body: body, accessToken: accessToken)
    }

    public func verifyEmail(token: String) async throws -> TikoIdentityBundle {
        try await send(path: "/identity/email/verify", method: "POST", body: VerifyRequest(token: token, otp: nil), accessToken: nil)
    }

    public func verifyOtp(otp: String) async throws -> TikoIdentityBundle {
        let sanitized = otp.filter(\.isNumber)
        return try await send(path: "/identity/email/verify", method: "POST", body: VerifyRequest(token: nil, otp: sanitized), accessToken: nil)
    }

    public func logout(accessToken: String) async throws {
        let _: EmptyResponse = try await send(path: "/identity/logout", method: "POST", body: EmptyBody?.none, accessToken: accessToken)
    }

    public func deleteSelf(accessToken: String) async throws {
        let _: EmptyResponse = try await send(path: "/identity/me", method: "DELETE", body: EmptyBody?.none, accessToken: accessToken)
    }

    public func getProfile(accessToken: String) async throws -> TikoIdentityProfile {
        let response: ProfileResponse = try await send(path: "/identity/profile", method: "GET", body: EmptyBody?.none, accessToken: accessToken)
        return response.profile
    }

    public func updateProfile(accessToken: String, patch: TikoIdentityProfile) async throws -> TikoIdentityProfile {
        let response: ProfileResponse = try await send(path: "/identity/profile", method: "PUT", body: patch, accessToken: accessToken)
        return response.profile
    }

    // Backward-compatible naming for existing TikoKit sheets.
    public func requestRecoveryEmail(email: String, accessToken: String? = nil) async throws {
        try await createEmailChallenge(email: email, purpose: "recover", accessToken: accessToken)
    }

    public func verifyMagicLink(token: String) async throws -> TikoIdentityBundle {
        try await verifyEmail(token: token)
    }

    private func send<Response: Decodable, Body: Encodable>(path: String, method: String, body: Body, accessToken: String?) async throws -> Response {
        let url = baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("ios", forHTTPHeaderField: "X-Tiko-Client")
        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        if !(body is Optional<EmptyBody>) {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try encoder.encode(body)
        }

        let (data, response) = try await urlSession.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw TikoIdentityClientError.invalidResponse }
        if http.statusCode == 204 { return EmptyResponse() as! Response }
        guard (200..<300).contains(http.statusCode) else {
            throw TikoIdentityClientError.server(statusCode: http.statusCode, body: String(data: data, encoding: .utf8) ?? "")
        }
        return try decoder.decode(Response.self, from: data)
    }
}

// MARK: - Session store

public protocol TikoIdentityStorage: Sendable {
    func load() throws -> TikoIdentityBundle?
    func save(_ bundle: TikoIdentityBundle) throws
    func clearSessionKeepingDevice() throws
    func clearAll() throws
}

public final class TikoDeviceSessionStore: TikoIdentityStorage, @unchecked Sendable {
    public static let sharedNamespace = "org.tiko.identity"

    private let defaults: UserDefaults
    private let sessionKey: String

    public init(defaults: UserDefaults = .standard, namespace: String = TikoDeviceSessionStore.sharedNamespace) {
        self.defaults = defaults
        self.sessionKey = "\(namespace).identityBundle"
    }

    public static func sharedKeychainAccessGroup(teamId: String) -> String {
        "\(teamId).\(sharedNamespace)"
    }

    public func load() throws -> TikoIdentityBundle? {
        guard let data = defaults.data(forKey: sessionKey) else { return nil }
        return try JSONDecoder().decode(TikoIdentityBundle.self, from: data)
    }

    public func save(_ bundle: TikoIdentityBundle) throws {
        let data = try JSONEncoder().encode(bundle)
        defaults.set(data, forKey: sessionKey)
    }

    public func clearSessionKeepingDevice() throws {
        guard let bundle = try load() else { return }
        try save(TikoIdentityBundle(subject: bundle.subject, device: bundle.device, account: bundle.account, session: nil))
    }

    public func clearAll() throws {
        defaults.removeObject(forKey: sessionKey)
    }
}

#if canImport(Security)
public final class TikoKeychainIdentityStore: TikoIdentityStorage, @unchecked Sendable {
    private let service: String
    private let account: String
    private let accessGroup: String?

    public init(service: String = TikoDeviceSessionStore.sharedNamespace, account: String = "identityBundle", accessGroup: String? = nil) {
        self.service = service
        self.account = account
        self.accessGroup = accessGroup
    }

    public func load() throws -> TikoIdentityBundle? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else { throw KeychainError(status: status) }
        return try JSONDecoder().decode(TikoIdentityBundle.self, from: data)
    }

    public func save(_ bundle: TikoIdentityBundle) throws {
        let data = try JSONEncoder().encode(bundle)
        var query = baseQuery()
        let attributes = [kSecValueData as String: data]
        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecSuccess { return }
        if updateStatus != errSecItemNotFound { throw KeychainError(status: updateStatus) }
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let addStatus = SecItemAdd(query as CFDictionary, nil)
        guard addStatus == errSecSuccess else { throw KeychainError(status: addStatus) }
    }

    public func clearSessionKeepingDevice() throws {
        guard let bundle = try load() else { return }
        try save(TikoIdentityBundle(subject: bundle.subject, device: bundle.device, account: bundle.account, session: nil))
    }

    public func clearAll() throws {
        let status = SecItemDelete(baseQuery() as CFDictionary)
        if status != errSecSuccess && status != errSecItemNotFound { throw KeychainError(status: status) }
    }

    private func baseQuery() -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        if let accessGroup { query[kSecAttrAccessGroup as String] = accessGroup }
        return query
    }

    public struct KeychainError: Error, Equatable, Sendable {
        public let status: OSStatus
    }
}
#endif

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

private struct EmailChallengeRequest: Encodable {
    let email: String
    let purpose: String
}

private struct EmailChallengeResponse: Decodable {
    let ok: Bool?
    let message: String?
}

private struct VerifyRequest: Encodable {
    let token: String?
    let otp: String?
}

private struct EmptyBody: Codable {}
private struct EmptyResponse: Codable {}
