import Foundation
import Observation

@MainActor
@Observable
final class RadioLibraryStore {
    private static let storageKey = "radio.tracks"

    private(set) var tracks: [RadioTrack] = []
    var categories: [RadioCategory] = defaultRadioCategories
    var selectedCategoryID: String?

    init() {
        load()
    }

    var snapshot: RadioLibrarySnapshot {
        RadioLibrarySnapshot(
            tracks: tracks,
            categories: categories,
            selectedCategoryID: selectedCategoryID
        )
    }

    func load(userDefaults: UserDefaults = .standard) {
        guard let data = userDefaults.data(forKey: Self.storageKey), !data.isEmpty else {
            tracks = []
            return
        }
        tracks = (try? JSONDecoder().decode([RadioTrack].self, from: data)) ?? []
    }

    func save(userDefaults: UserDefaults = .standard) {
        guard let data = try? JSONEncoder().encode(tracks) else { return }
        userDefaults.set(data, forKey: Self.storageKey)
    }

    func addTrack(_ track: RadioTrack, userDefaults: UserDefaults = .standard) {
        tracks.append(track)
        save(userDefaults: userDefaults)
    }

    func removeTrack(id: RadioTrack.ID, userDefaults: UserDefaults = .standard) {
        tracks.removeAll { $0.id == id }
        save(userDefaults: userDefaults)
    }

    func replaceTracks(_ newTracks: [RadioTrack], userDefaults: UserDefaults = .standard) {
        tracks = newTracks
        save(userDefaults: userDefaults)
    }
}

let defaultRadioCategories: [RadioCategory] = [
    RadioCategory(id: "favorites", title: "Favorites", symbol: "star.fill", colorHex: 0xf8c22e),
    RadioCategory(id: "calm", title: "Calm", symbol: "moon.stars.fill", colorHex: 0x2488ff),
    RadioCategory(id: "dance", title: "Dance", symbol: "figure.dance", colorHex: 0xe84057)
]

protocol RadioSyncClient {
    func fetchLibrary() async throws -> RadioLibrarySnapshot
    func pushLibrary(_ snapshot: RadioLibrarySnapshot) async throws
}
