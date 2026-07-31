import Foundation
#if canImport(Security)
import Security
#endif

/// Support, backed by Arlez.
///
/// This speaks Arlez's *public client* contract, which is the one written for
/// untrusted apps: a report is addressed with a product ID, and the contract
/// states outright that a product ID "selects a destination; it is not a
/// credential". No API key is involved, and none may be — the Arlez key is a
/// founder secret that would let anyone holding it read and change the whole
/// product inbox. It is not in this file, this framework, or this repository.
///
/// Submitting a report returns a capability scoped to that one report. That
/// token is what lets a parent read a reply and answer it, so it goes in the
/// Keychain rather than `UserDefaults`.
public enum TikoArlez {
    public static let baseURL = URL(string: "https://api.arlez.app")!

    /// The Arlez product for the running app, resolved from its own bundle
    /// identifier. Apps therefore wire up nothing: adding one is a line of JSON.
    public static var productIDForRunningApp: String? {
        TikoArlezProjects.productID(forBundleID: Bundle.main.bundleIdentifier)
    }
}

// MARK: - The published form

public struct TikoSupportField: Codable, Sendable, Identifiable, Equatable {
    public let id: String
    public let label: String
    public let kind: Kind
    public let required: Bool

    public enum Kind: String, Codable, Sendable {
        case shortText
        case longText
        /// A kind Arlez adds later must not crash a shipped app.
        case unknown

        public init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = Kind(rawValue: raw) ?? .unknown
        }
    }
}

public struct TikoSupportCategory: Codable, Sendable, Identifiable, Equatable {
    public let id: String
    public let label: String
    public let helpText: String?
    public let icon: String?
    public let color: String?
    public let fields: [TikoSupportField]
}

public struct TikoSupportConfiguration: Codable, Sendable, Equatable {
    public let id: String
    public let name: String
    public let projectName: String
    public let title: String
    public let categories: [TikoSupportCategory]
}

// MARK: - A conversation

public struct TikoSupportMessage: Codable, Sendable, Identifiable, Equatable {
    public let id: String
    public let authorType: String
    public let body: String
    public let createdAt: String

    /// True when this came from Tiko rather than the parent, which is the only
    /// distinction the UI needs to draw.
    public var isFromSupport: Bool { authorType != "reporter" }
}

public struct TikoSupportConversation: Codable, Sendable, Equatable {
    public let id: String
    public let category: String?
    public let categoryIcon: String?
    public let message: String?
    public let status: String?
    public let createdAt: String?
    public let projectName: String?
    public let messages: [TikoSupportMessage]
    public let canReply: Bool?

    public var replyingIsOpen: Bool { canReply ?? false }
}

private struct ConversationEnvelope: Codable { let report: TikoSupportConversation }

/// What the app keeps so a parent can come back to a conversation they started.
public struct TikoSupportTicket: Codable, Sendable, Identifiable, Equatable {
    public let id: String
    public let accessToken: String
    public let productID: String
    public let categoryLabel: String
    public let createdAt: Date

    public init(id: String, accessToken: String, productID: String, categoryLabel: String, createdAt: Date) {
        self.id = id
        self.accessToken = accessToken
        self.productID = productID
        self.categoryLabel = categoryLabel
        self.createdAt = createdAt
    }
}

public enum TikoSupportError: Error, Equatable, Sendable {
    case notConfigured
    case invalidResponse
    case server(statusCode: Int, body: String)
    case missingRequiredField(String)

    /// A withdrawn or expired conversation, which the UI forgets rather than
    /// showing a parent an error they cannot act on.
    public var isGone: Bool {
        if case .server(let code, _) = self { return code == 404 || code == 401 }
        return false
    }
}

// MARK: - Client

public struct TikoArlezClient: Sendable {
    private let session: URLSession
    private let baseURL: URL

    public init(session: URLSession = .shared, baseURL: URL = TikoArlez.baseURL) {
        self.session = session
        self.baseURL = baseURL
    }

    public func configuration(productID: String) async throws -> TikoSupportConfiguration {
        let url = baseURL.appending(path: "/v1/projects/\(productID)/feedback-configuration")
        return try await send(URLRequest(url: url), decoding: TikoSupportConfiguration.self)
    }

    /// Submits a report and returns the ticket to keep. `fields` must use the
    /// identifiers from the fetched configuration — Arlez rejects anything else,
    /// which is why the form is built from the configuration and never hardcoded.
    public func submit(
        productID: String,
        category: TikoSupportCategory,
        fields: [String: String],
        email: String?,
        installationID: String?,
        metadata: [String: String]
    ) async throws -> TikoSupportTicket {
        for field in category.fields where field.required {
            let value = fields[field.id]?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if value.isEmpty { throw TikoSupportError.missingRequiredField(field.id) }
        }

        var body: [String: Any] = [
            "productID": productID,
            "categoryID": category.id,
            "fields": fields.filter { !$0.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        ]
        if let email, !email.isEmpty { body["email"] = email }
        if let installationID, !installationID.isEmpty { body["installationID"] = installationID }
        if !metadata.isEmpty { body["metadata"] = metadata }

        var request = URLRequest(url: baseURL.appending(path: "/v1/reports"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let receipt = try await send(request, decoding: Receipt.self)
        return TikoSupportTicket(
            id: receipt.reportID,
            accessToken: receipt.reporterAccessToken,
            productID: productID,
            categoryLabel: category.label,
            createdAt: Date()
        )
    }

    public func conversation(for ticket: TikoSupportTicket) async throws -> TikoSupportConversation {
        var request = URLRequest(url: baseURL.appending(path: "/v1/reports/\(ticket.id)"))
        request.setValue("Bearer \(ticket.accessToken)", forHTTPHeaderField: "Authorization")
        return try await send(request, decoding: ConversationEnvelope.self).report
    }

    public func reply(to ticket: TikoSupportTicket, body text: String) async throws {
        var request = URLRequest(url: baseURL.appending(path: "/v1/reports/\(ticket.id)/messages"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(ticket.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["body": text])
        _ = try await perform(request)
    }

    /// Withdraws a report. Arlez enforces its own withdrawal window.
    public func withdraw(_ ticket: TikoSupportTicket) async throws {
        var request = URLRequest(url: baseURL.appending(path: "/v1/reports/\(ticket.id)"))
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(ticket.accessToken)", forHTTPHeaderField: "Authorization")
        _ = try await perform(request)
    }

    private struct Receipt: Codable {
        let reportID: String
        let receivedAt: String
        let reporterAccessToken: String
    }

    private func send<T: Decodable>(_ request: URLRequest, decoding: T.Type) async throws -> T {
        let data = try await perform(request)
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw TikoSupportError.invalidResponse
        }
    }

    @discardableResult
    private func perform(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw TikoSupportError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            throw TikoSupportError.server(
                statusCode: http.statusCode,
                body: String(data: data, encoding: .utf8) ?? ""
            )
        }
        return data
    }
}

// MARK: - Where the tickets live

/// Where tickets are kept, so the ordering and de-duplication rules can be
/// tested without a Keychain.
///
/// A test bundle is unsigned and has no keychain entitlement, so every Keychain
/// write there fails silently. Mirroring `TikoIdentityStorage` keeps the rules
/// in one testable place and leaves only the four Security calls untested — the
/// same trade the identity layer already makes.
public protocol TikoSupportTicketStoring: Sendable {
    func load() -> [TikoSupportTicket]
    func save(_ tickets: [TikoSupportTicket])
}

public extension TikoSupportTicketStoring {
    /// Newest first, and one row per report however many times it is saved.
    func add(_ ticket: TikoSupportTicket) {
        let others = load().filter { $0.id != ticket.id }
        save(([ticket] + others).sorted { $0.createdAt > $1.createdAt })
    }

    func remove(id: String) {
        save(load().filter { $0.id != id })
    }

    var sortedTickets: [TikoSupportTicket] {
        load().sorted { $0.createdAt > $1.createdAt }
    }
}

/// Tickets held in memory only. Used by tests, and the fallback on any platform
/// without the Security framework.
public final class TikoInMemoryTicketStore: TikoSupportTicketStoring, @unchecked Sendable {
    private var tickets: [TikoSupportTicket]

    public init(tickets: [TikoSupportTicket] = []) { self.tickets = tickets }
    public func load() -> [TikoSupportTicket] { tickets }
    public func save(_ tickets: [TikoSupportTicket]) { self.tickets = tickets }
}

/// Report capabilities in the Keychain, not `UserDefaults`.
///
/// Each one grants read and write access to a conversation that may contain
/// whatever a parent chose to tell us, so it is stored the way the contract asks
/// — "platform-secure storage" — and never leaves the device it was made on.
public struct TikoSupportTicketStore: TikoSupportTicketStoring, Sendable {
    private let service: String
    private let account: String

    public init(service: String = "mt.tiko.shared", account: String = "arlezSupportTickets") {
        self.service = service
        self.account = account
    }

#if canImport(Security)
    public func load() -> [TikoSupportTicket] {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let tickets = try? JSONDecoder().decode([TikoSupportTicket].self, from: data)
        else { return [] }
        return tickets
    }

    public func save(_ tickets: [TikoSupportTicket]) {
        guard let data = try? JSONEncoder().encode(tickets) else { return }
        var query = baseQuery()
        if SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary) == errSecSuccess {
            return
        }
        query[kSecValueData as String] = data
        // The parent may be mid-sentence when the screen locks; this survives
        // that without syncing a support token to another device.
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(query as CFDictionary, nil)
    }

    private func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }
#else
    // No Security framework here; nothing can be persisted securely, so nothing is.
    public func load() -> [TikoSupportTicket] { [] }
    public func save(_ tickets: [TikoSupportTicket]) {}
#endif
}
