import Foundation
import Observation

/// A streaming service a family already pays for.
enum RadioServiceProvider: String, Codable, CaseIterable, Identifiable, Sendable {
    case spotify
    case appleMusic = "apple-music"

    var id: String { rawValue }

    var name: String {
        switch self {
        case .spotify: return "Spotify"
        case .appleMusic: return "Apple Music"
        }
    }

    /// The track source songs from this service are stored under.
    var trackSource: TrackSource {
        switch self {
        case .spotify: return .spotify
        case .appleMusic: return .appleMusic
        }
    }

    /// Shown as the placeholder where a parent pastes a share link.
    var linkExample: String {
        switch self {
        case .spotify: return "https://open.spotify.com/track/…"
        case .appleMusic: return "https://music.apple.com/…?i=…"
        }
    }

    var symbol: String { "music.note" }

    /// The i18n key describing how this service's songs actually play.
    var hintKey: String {
        switch self {
        case .spotify: return "radio.services.spotifyHint"
        case .appleMusic: return "radio.services.appleMusicHint"
        }
    }
}

struct RadioSubscription: Codable, Equatable, Identifiable, Sendable {
    let provider: RadioServiceProvider
    var displayName: String?
    let linkedAt: String

    var id: String { provider.rawValue }

    init(provider: RadioServiceProvider, displayName: String? = nil, linkedAt: String? = nil) {
        self.provider = provider
        self.displayName = displayName
        self.linkedAt = linkedAt ?? ISO8601DateFormatter().string(from: Date())
    }
}

/// The services this family linked. Local-first like the rest of Radio: linking
/// is a parent saying "we have this subscription", not an account handover.
@MainActor
@Observable
final class RadioSubscriptionStore {
    private static let storageKey = "radio.subscriptions.v1"

    private(set) var subscriptions: [RadioSubscription] = []

    init(userDefaults: UserDefaults = .standard) {
        load(userDefaults: userDefaults)
    }

    func load(userDefaults: UserDefaults = .standard) {
        guard let data = userDefaults.data(forKey: Self.storageKey),
              let decoded = try? JSONDecoder().decode([RadioSubscription].self, from: data) else {
            subscriptions = []
            return
        }
        subscriptions = decoded
    }

    func save(userDefaults: UserDefaults = .standard) {
        guard let data = try? JSONEncoder().encode(subscriptions) else { return }
        userDefaults.set(data, forKey: Self.storageKey)
    }

    func isLinked(_ provider: RadioServiceProvider) -> Bool {
        subscriptions.contains { $0.provider == provider }
    }

    var linkedProviders: [RadioServiceProvider] {
        RadioServiceProvider.allCases.filter { isLinked($0) }
    }

    @discardableResult
    func link(_ provider: RadioServiceProvider, displayName: String? = nil, userDefaults: UserDefaults = .standard) -> RadioSubscription {
        let subscription = RadioSubscription(provider: provider, displayName: displayName)
        subscriptions.removeAll { $0.provider == provider }
        subscriptions.append(subscription)
        save(userDefaults: userDefaults)
        return subscription
    }

    func unlink(_ provider: RadioServiceProvider, userDefaults: UserDefaults = .standard) {
        subscriptions.removeAll { $0.provider == provider }
        save(userDefaults: userDefaults)
    }
}
