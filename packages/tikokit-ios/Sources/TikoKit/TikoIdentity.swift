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
    public let accountType: String?

    public init(id: String, subjectId: String, emailVerified: Bool, email: String? = nil, accountType: String? = nil) {
        self.id = id
        self.subjectId = subjectId
        self.emailVerified = emailVerified
        self.email = email
        self.accountType = accountType
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

// MARK: - Runtime & capability types

public enum TikoRuntimeMode: String, Codable, Sendable {
    case parent
    case child
}

public struct TikoRuntimeSummary: Codable, Equatable, Sendable {
    public let mode: TikoRuntimeMode
    public let childModeEnabled: Bool
    public let pinConfigured: Bool

    public init(mode: TikoRuntimeMode = .parent, childModeEnabled: Bool = false, pinConfigured: Bool = false) {
        self.mode = mode
        self.childModeEnabled = childModeEnabled
        self.pinConfigured = pinConfigured
    }
}

public struct TikoUserCapabilities: Codable, Equatable, Sendable {
    public let canVerifyEmail: Bool
    public let canUseParentMode: Bool
    public let canUseChildMode: Bool
    public let canManageChildAccounts: Bool
    public let canEditContent: Bool
    public let canDeleteAccount: Bool

    public init(
        canVerifyEmail: Bool = false,
        canUseParentMode: Bool = false,
        canUseChildMode: Bool = false,
        canManageChildAccounts: Bool = false,
        canEditContent: Bool = false,
        canDeleteAccount: Bool = true
    ) {
        self.canVerifyEmail = canVerifyEmail
        self.canUseParentMode = canUseParentMode
        self.canUseChildMode = canUseChildMode
        self.canManageChildAccounts = canManageChildAccounts
        self.canEditContent = canEditContent
        self.canDeleteAccount = canDeleteAccount
    }
}

public struct TikoChildAccountSummary: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let subjectId: String
    public let managerSubjectId: String
    public let handle: String
    public let name: String
    public let displayName: String
}

public struct TikoPinGrant: Codable, Equatable, Sendable {
    public let token: String
    public let purpose: String
    public let expiresAt: String
}

// MARK: - Identity bundle

public struct TikoIdentityBundle: Codable, Equatable, Sendable {
    public let subject: TikoIdentitySubject
    public let device: TikoIdentityDevice?
    public let account: TikoIdentityAccount?
    public let session: TikoIdentitySession?
    public let runtime: TikoRuntimeSummary?
    public let capabilities: TikoUserCapabilities?
    public let roles: [String]?

    public var accessToken: String? { session?.token }
    public var isRecoverable: Bool { account?.emailVerified == true }
    public var isChildMode: Bool { runtime?.mode == .child }
    public var isPinConfigured: Bool { runtime?.pinConfigured ?? false }
    public var isChildModeEnabled: Bool { runtime?.childModeEnabled ?? false }

    public init(
        subject: TikoIdentitySubject,
        device: TikoIdentityDevice? = nil,
        account: TikoIdentityAccount? = nil,
        session: TikoIdentitySession? = nil,
        runtime: TikoRuntimeSummary? = nil,
        capabilities: TikoUserCapabilities? = nil,
        roles: [String]? = nil
    ) {
        self.subject = subject
        self.device = device
        self.account = account
        self.session = session
        self.runtime = runtime
        self.capabilities = capabilities
        self.roles = roles
    }

    public func preservingSession(from existing: TikoIdentityBundle) -> TikoIdentityBundle {
        TikoIdentityBundle(
            subject: subject,
            device: device ?? existing.device,
            account: account,
            session: session ?? existing.session,
            runtime: runtime ?? existing.runtime,
            capabilities: capabilities ?? existing.capabilities,
            roles: roles ?? existing.roles
        )
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
    public var displayName: String?
    public var avatarUrl: String?

    public init(displayName: String? = nil, avatarUrl: String? = nil) {
        self.displayName = displayName
        self.avatarUrl = avatarUrl
    }
}

private struct ProfileResponse: Codable {
    let profile: TikoIdentityProfile
}

// MARK: - Deletion & Reset Types

public enum TikoDeletionScope: String, Codable, Sendable {
    case localDevice = "local-device"
    case account
    case childAccount = "child_account"
}

public struct TikoDeletionRequest: Codable, Sendable {
    public let id: String
    public let scope: TikoDeletionScope
    public let status: String
    public let createdAt: String
    public let updatedAt: String
    public let completedAt: String?
    public let canCancel: Bool
}

public struct TikoResetRequest: Codable, Sendable {
    public let id: String
    public let status: String
    public let categoriesAffected: [String]
    public let createdAt: String
    public let completedAt: String?
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

    /// Legacy endpoint — prefer createDeletionRequest(scope: .account)
    @available(*, deprecated, message: "Use createDeletionRequest(scope: .account) instead")
    public func deleteSelf(accessToken: String) async throws {
        let _: EmptyResponse = try await send(path: "/identity/me", method: "DELETE", body: EmptyBody?.none, accessToken: accessToken)
    }

    // MARK: - Deletion & Reset

    public func createDeletionRequest(accessToken: String, scope: TikoDeletionScope, childAccountId: String? = nil, pinGrantToken: String? = nil) async throws -> TikoDeletionRequest {
        var body: [String: String] = ["scope": scope.rawValue]
        if let childAccountId { body["childAccountId"] = childAccountId }
        if let pinGrantToken { body["pinGrantToken"] = pinGrantToken }
        return try await send(path: "/identity/deletion-requests", method: "POST", body: body, accessToken: accessToken)
    }

    public func getDeletionRequest(accessToken: String, requestId: String) async throws -> TikoDeletionRequest {
        return try await send(path: "/identity/deletion-requests/\(requestId)", method: "GET", body: EmptyBody?.none, accessToken: accessToken)
    }

    public func resetAccountData(accessToken: String, pinGrantToken: String? = nil) async throws -> TikoResetRequest {
        var body: [String: String] = ["confirmation": "reset_my_data"]
        if let pinGrantToken { body["pinGrantToken"] = pinGrantToken }
        return try await send(path: "/identity/reset", method: "POST", body: body, accessToken: accessToken)
    }

    public func resetChildAccountProgress(accessToken: String, childAccountId: String) async throws -> TikoResetRequest {
        return try await send(path: "/identity/child-accounts/\(childAccountId)/progress/reset", method: "POST", body: ["confirmation": "reset_progress"], accessToken: accessToken)
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

    // MARK: - PIN management

    public func setPin(accessToken: String, pin: String, currentPin: String? = nil) async throws -> TikoIdentityBundle {
        try await send(path: "/identity/pin", method: "POST", body: PinRequest(pin: pin, currentPin: currentPin), accessToken: accessToken)
    }

    public func verifyPin(accessToken: String, pin: String, purpose: String = "parent_mode") async throws -> TikoPinVerifyResponse {
        try await send(path: "/identity/pin/verify", method: "POST", body: PinVerifyRequest(pin: pin, purpose: purpose), accessToken: accessToken)
    }

    public func removePin(accessToken: String, pin: String) async throws -> TikoIdentityBundle {
        try await send(path: "/identity/pin", method: "DELETE", body: PinRemoveRequest(pin: pin), accessToken: accessToken)
    }

    // MARK: - Runtime mode transitions

    public func enableChildMode(accessToken: String) async throws -> TikoIdentityBundle {
        try await send(path: "/identity/mode/child/enable", method: "POST", body: EmptyBody?.none, accessToken: accessToken)
    }

    public func enterChildMode(accessToken: String) async throws -> TikoIdentityBundle {
        try await send(path: "/identity/mode/child", method: "POST", body: EmptyBody?.none, accessToken: accessToken)
    }

    public func enterParentMode(accessToken: String, pin: String? = nil) async throws -> TikoIdentityBundle {
        let body: PinModeRequest? = pin.map { PinModeRequest(pin: $0) }
        return try await send(path: "/identity/mode/parent", method: "POST", body: body, accessToken: accessToken)
    }

    // MARK: - Child accounts

    public func listChildAccounts(accessToken: String) async throws -> [TikoChildAccountSummary] {
        let response: ChildAccountListResponse = try await send(path: "/identity/child-accounts", method: "GET", body: EmptyBody?.none, accessToken: accessToken)
        return response.childAccounts
    }

    public func createChildAccount(accessToken: String, name: String, code: String, language: String? = nil) async throws -> TikoChildAccountSummary {
        let response: ChildAccountItemResponse = try await send(
            path: "/identity/child-accounts", method: "POST",
            body: ChildAccountCreateRequest(name: name, code: code, language: language),
            accessToken: accessToken
        )
        return response.child
    }

    public func updateChildAccount(accessToken: String, childAccountId: String, name: String, language: String? = nil) async throws -> TikoChildAccountSummary {
        let response: ChildAccountItemResponse = try await send(
            path: "/identity/child-accounts/\(childAccountId)", method: "PUT",
            body: ChildAccountUpdateRequest(name: name, language: language),
            accessToken: accessToken
        )
        return response.child
    }

    public func resetChildAccountCode(accessToken: String, childAccountId: String, code: String) async throws -> TikoChildAccountSummary {
        let response: ChildAccountItemResponse = try await send(
            path: "/identity/child-accounts/\(childAccountId)/code/reset", method: "POST",
            body: ChildAccountCodeResetRequest(code: code),
            accessToken: accessToken
        )
        return response.child
    }

    public func deleteChildAccount(accessToken: String, childAccountId: String) async throws {
        let _: EmptyResponse = try await send(
            path: "/identity/child-accounts/\(childAccountId)", method: "DELETE",
            body: EmptyBody?.none, accessToken: accessToken
        )
    }

    public func loginChildAccount(name: String, code: String) async throws -> TikoIdentityBundle {
        try await send(path: "/identity/child-accounts/login", method: "POST", body: ChildAccountLoginRequest(name: name, code: code), accessToken: nil)
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

public final class TikoUserDefaultsIdentityStore: TikoIdentityStorage, @unchecked Sendable {
    private let defaults: UserDefaults
    private let sessionKey: String

    public init(defaults: UserDefaults = .standard, namespace: String = TikoDeviceSessionStore.sharedNamespace) {
        self.defaults = defaults
        self.sessionKey = "\(namespace).identityBundle"
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
        try save(TikoIdentityBundle(subject: bundle.subject, device: bundle.device, account: bundle.account, session: nil, runtime: bundle.runtime, capabilities: bundle.capabilities, roles: bundle.roles))
    }

    public func clearAll() throws {
        defaults.removeObject(forKey: sessionKey)
    }
}

public final class TikoDeviceSessionStore: TikoIdentityStorage, @unchecked Sendable {
    public static let sharedNamespace = "org.tiko.identity"

    private let primary: TikoIdentityStorage
    private let legacy: TikoUserDefaultsIdentityStore?

    public convenience init(
        defaults: UserDefaults = .standard,
        namespace: String = TikoDeviceSessionStore.sharedNamespace,
        accessGroup: String? = nil
    ) {
        let legacy = TikoUserDefaultsIdentityStore(defaults: defaults, namespace: namespace)
        #if canImport(Security)
        let resolvedAccessGroup = accessGroup ?? Self.defaultKeychainAccessGroup()
        self.init(
            primary: TikoKeychainIdentityStore(service: namespace, account: "identityBundle", accessGroup: resolvedAccessGroup),
            legacy: legacy
        )
        #else
        self.init(primary: legacy, legacy: nil)
        #endif
    }

    public init(primary: TikoIdentityStorage, legacy: TikoUserDefaultsIdentityStore? = nil) {
        self.primary = primary
        self.legacy = legacy
    }

    public static func sharedKeychainAccessGroup(teamId: String) -> String {
        "\(teamId).\(sharedNamespace)"
    }

    #if canImport(Security)
    private static func defaultKeychainAccessGroup() -> String? {
        Bundle.main.object(forInfoDictionaryKey: "TikoKeychainAccessGroup") as? String
    }
    #endif

    public func load() throws -> TikoIdentityBundle? {
        if let bundle = try primary.load() {
            return bundle
        }

        guard let legacy, let legacyBundle = try legacy.load() else {
            return nil
        }

        try primary.save(legacyBundle)
        try legacy.clearAll()
        return legacyBundle
    }

    public func save(_ bundle: TikoIdentityBundle) throws {
        try primary.save(bundle)
        try legacy?.clearAll()
    }

    public func clearSessionKeepingDevice() throws {
        guard let bundle = try load() else { return }
        try save(TikoIdentityBundle(subject: bundle.subject, device: bundle.device, account: bundle.account, session: nil, runtime: bundle.runtime, capabilities: bundle.capabilities, roles: bundle.roles))
    }

    public func clearAll() throws {
        try primary.clearAll()
        try legacy?.clearAll()
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
        try save(TikoIdentityBundle(subject: bundle.subject, device: bundle.device, account: bundle.account, session: nil, runtime: bundle.runtime, capabilities: bundle.capabilities, roles: bundle.roles))
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

// MARK: - PIN & mode request types

private struct PinRequest: Encodable {
    let pin: String
    let currentPin: String?
}

private struct PinVerifyRequest: Encodable {
    let pin: String
    let purpose: String
}

private struct PinRemoveRequest: Encodable {
    let pin: String
}

private struct PinModeRequest: Encodable {
    let pin: String
}

public struct TikoPinVerifyResponse: Decodable, Equatable, Sendable {
    public let ok: Bool
    public let grant: TikoPinGrant
}

// MARK: - Child account request/response types

private struct ChildAccountCreateRequest: Encodable {
    let name: String
    let code: String
    let language: String?
}

private struct ChildAccountUpdateRequest: Encodable {
    let name: String
    let language: String?
}

private struct ChildAccountCodeResetRequest: Encodable {
    let code: String
}

private struct ChildAccountLoginRequest: Encodable {
    let name: String
    let code: String
}

private struct ChildAccountListResponse: Decodable {
    let childAccounts: [TikoChildAccountSummary]
}

private struct ChildAccountItemResponse: Decodable {
    let child: TikoChildAccountSummary
}
