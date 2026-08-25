import Foundation

/// Somewhere small to remember when we last looked and what was waved away.
public protocol TikoKeyValueStore: Sendable {
    func data(forKey key: String) -> Data?
    func set(_ data: Data?, forKey key: String)
}

public struct TikoUserDefaultsStore: TikoKeyValueStore, @unchecked Sendable {
    private let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    public func data(forKey key: String) -> Data? { defaults.data(forKey: key) }
    public func set(_ data: Data?, forKey key: String) { defaults.set(data, forKey: key) }
}

public final class TikoInMemoryStore: TikoKeyValueStore, @unchecked Sendable {
    private var storage: [String: Data] = [:]
    private let lock = NSLock()

    public init() {}

    public func data(forKey key: String) -> Data? {
        lock.lock(); defer { lock.unlock() }
        return storage[key]
    }

    public func set(_ data: Data?, forKey key: String) {
        lock.lock(); defer { lock.unlock() }
        storage[key] = data
    }
}

/// Whether a newer build of this app is on the App Store.
///
/// Apple gives an app no way to be told about its own updates, so the only
/// reliable source is the public iTunes lookup endpoint: one GET, no key, no
/// account, and nothing about the player leaves the device — the request
/// carries the bundle id and nothing else.
///
/// The games are offline-first, so this is strictly an extra: it runs at most
/// once a day, it never blocks anything, and a failure is silent. If the check
/// cannot run, the app behaves exactly as it did before.
public struct TikoStoreRelease: Equatable, Sendable {
    public let version: String
    public let storeURL: URL?

    public init(version: String, storeURL: URL?) {
        self.version = version
        self.storeURL = storeURL
    }
}

public protocol TikoReleaseLookup: Sendable {
    func latestRelease(bundleID: String) async throws -> TikoStoreRelease?
}

public struct TikoAppStoreLookup: TikoReleaseLookup {
    private let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public func latestRelease(bundleID: String) async throws -> TikoStoreRelease? {
        var components = URLComponents(string: "https://itunes.apple.com/lookup")
        components?.queryItems = [URLQueryItem(name: "bundleId", value: bundleID)]
        guard let url = components?.url else { return nil }

        let (data, _) = try await session.data(from: url)
        guard let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let results = payload["results"] as? [[String: Any]],
              let first = results.first,
              let version = first["version"] as? String
        else { return nil }

        let storeURL = (first["trackViewUrl"] as? String).flatMap(URL.init(string:))
        return TikoStoreRelease(version: version, storeURL: storeURL)
    }
}

public enum TikoVersion {
    /// Compares dotted version strings by number, so 1.10 is newer than 1.9 —
    /// a plain string comparison gets that backwards.
    public static func isNewer(_ candidate: String, than current: String) -> Bool {
        let left = components(candidate)
        let right = components(current)

        for index in 0..<max(left.count, right.count) {
            let lhs = index < left.count ? left[index] : 0
            let rhs = index < right.count ? right[index] : 0
            if lhs != rhs { return lhs > rhs }
        }
        return false
    }

    private static func components(_ version: String) -> [Int] {
        version.split(separator: ".").map { Int($0.filter(\.isNumber)) ?? 0 }
    }
}

/// Publishes an update notice for the About panel. Checks once a day at most.
@MainActor
public final class TikoUpdateNotice: ObservableObject {
    @Published public private(set) var release: TikoStoreRelease?

    private let bundleID: String
    private let currentVersion: String
    private let lookup: TikoReleaseLookup
    private let store: TikoKeyValueStore
    private let now: @Sendable () -> Date
    private let interval: TimeInterval

    private static let lastCheckKey = "tiko.update.lastCheck"
    private static let dismissedKey = "tiko.update.dismissedVersion"

    public init(
        bundleID: String? = nil,
        currentVersion: String? = nil,
        lookup: TikoReleaseLookup = TikoAppStoreLookup(),
        store: TikoKeyValueStore,
        interval: TimeInterval = 60 * 60 * 24,
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.bundleID = bundleID ?? Bundle.main.bundleIdentifier ?? ""
        self.currentVersion = currentVersion
            ?? (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String)
            ?? "0"
        self.lookup = lookup
        self.store = store
        self.interval = interval
        self.now = now
    }

    public func checkIfDue() async {
        guard bundleID.isEmpty == false else { return }

        if let raw = store.data(forKey: Self.lastCheckKey),
           let stamp = try? JSONDecoder().decode(Date.self, from: raw),
           now().timeIntervalSince(stamp) < interval {
            return
        }

        guard let found = try? await lookup.latestRelease(bundleID: bundleID) else { return }

        if let stamp = try? JSONEncoder().encode(now()) {
            store.set(stamp, forKey: Self.lastCheckKey)
        }
        guard TikoVersion.isNewer(found.version, than: currentVersion) else {
            release = nil
            return
        }
        // Waved away already? Stay quiet until there is a newer one than that.
        if let dismissed = dismissedVersion, TikoVersion.isNewer(found.version, than: dismissed) == false {
            release = nil
            return
        }
        release = found
    }

    /// The player said not now. Do not raise this version again.
    public func dismiss() {
        guard let version = release?.version else { return }
        store.set(Data(version.utf8), forKey: Self.dismissedKey)
        release = nil
    }

    private var dismissedVersion: String? {
        store.data(forKey: Self.dismissedKey).flatMap { String(data: $0, encoding: .utf8) }
    }
}
