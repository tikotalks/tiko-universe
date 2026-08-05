import Foundation
import Observation

@MainActor
@Observable
final class RadioLibraryStore {
    private static let storageKey = "radio.library.snapshot.v2"
    private static let legacyTracksKey = "radio.tracks"

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

    var selectedCategory: RadioCategory? {
        guard let selectedCategoryID else { return nil }
        return categories.first { $0.id == selectedCategoryID }
    }

    var collectionsWithTracks: [RadioCategory] {
        categories.filter { category in
            tracks.contains { $0.categoryId == category.id } || category.id == selectedCategoryID
        }
    }

    func tracks(in categoryID: String?) -> [RadioTrack] {
        guard let categoryID else { return tracks }
        return tracks.filter { $0.categoryId == categoryID }
    }

    func load(userDefaults: UserDefaults = .standard) {
        if let data = userDefaults.data(forKey: Self.storageKey),
           let snapshot = try? JSONDecoder().decode(RadioLibrarySnapshot.self, from: data) {
            tracks = snapshot.tracks
            categories = snapshot.categories.isEmpty ? defaultRadioCategories : snapshot.categories
            selectedCategoryID = snapshot.selectedCategoryID
            return
        }

        // Legacy migration: older native builds only stored a bare track array.
        if let data = userDefaults.data(forKey: Self.legacyTracksKey), !data.isEmpty {
            tracks = ((try? JSONDecoder().decode([RadioTrack].self, from: data)) ?? [])
                .map { track in
                    guard track.categoryId == nil else { return track }
                    return track.withCategory(defaultUncategorizedCategoryID)
                }
            categories = defaultRadioCategories
            selectedCategoryID = nil
            save(userDefaults: userDefaults)
            return
        }

        tracks = []
        categories = defaultRadioCategories
        selectedCategoryID = nil
    }

    func save(userDefaults: UserDefaults = .standard) {
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        userDefaults.set(data, forKey: Self.storageKey)
    }

    func addTrack(_ track: RadioTrack, userDefaults: UserDefaults = .standard) {
        tracks.append(track.categoryId == nil ? track.withCategory(defaultUncategorizedCategoryID) : track)
        save(userDefaults: userDefaults)
    }

    func removeTrack(id: RadioTrack.ID, userDefaults: UserDefaults = .standard) {
        tracks.removeAll { $0.id == id }
        save(userDefaults: userDefaults)
    }

    func moveTrack(_ track: RadioTrack, to categoryID: String?, userDefaults: UserDefaults = .standard) {
        tracks = tracks.map { existing in
            guard existing.id == track.id else { return existing }
            return RadioTrack(
                id: existing.id,
                title: existing.title,
                artist: existing.artist,
                source: existing.source,
                youtubeVideoId: existing.youtubeVideoId,
                audioUrl: existing.audioUrl,
                thumbnailUrl: existing.thumbnailUrl,
                duration: existing.duration,
                categoryId: categoryID,
                addedAt: existing.addedAt
            )
        }
        save(userDefaults: userDefaults)
    }

    func renameTrack(id: RadioTrack.ID, title: String, userDefaults: UserDefaults = .standard) {
        let cleaned = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return }
        tracks = tracks.map { existing in
            guard existing.id == id else { return existing }
            return RadioTrack(
                id: existing.id,
                title: cleaned,
                artist: existing.artist,
                source: existing.source,
                youtubeVideoId: existing.youtubeVideoId,
                audioUrl: existing.audioUrl,
                thumbnailUrl: existing.thumbnailUrl,
                duration: existing.duration,
                categoryId: existing.categoryId,
                addedAt: existing.addedAt
            )
        }
        save(userDefaults: userDefaults)
    }

    func addCategory(title: String, userDefaults: UserDefaults = .standard) -> RadioCategory {
        let baseID = title
            .lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .joined(separator: "-")
        let id = uniqueCategoryID(baseID.isEmpty ? "collection" : baseID)
        let color = defaultCategoryColors[categories.count % defaultCategoryColors.count]
        let category = RadioCategory(id: id, title: title, symbol: "music.note.list", color: color)
        categories.append(category)
        selectedCategoryID = category.id
        save(userDefaults: userDefaults)
        return category
    }

    func removeCategory(id: String, userDefaults: UserDefaults = .standard) {
        categories.removeAll { $0.id == id }
        tracks = tracks.map { track in
            guard track.categoryId == id else { return track }
            return RadioTrack(
                id: track.id,
                title: track.title,
                artist: track.artist,
                source: track.source,
                youtubeVideoId: track.youtubeVideoId,
                audioUrl: track.audioUrl,
                thumbnailUrl: track.thumbnailUrl,
                duration: track.duration,
                categoryId: defaultUncategorizedCategoryID,
                addedAt: track.addedAt
            )
        }
        if selectedCategoryID == id { selectedCategoryID = nil }
        save(userDefaults: userDefaults)
    }

    func renameCategory(id: String, title: String, userDefaults: UserDefaults = .standard) {
        let cleaned = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return }
        categories = categories.map { category in
            guard category.id == id else { return category }
            return RadioCategory(id: category.id, title: cleaned, symbol: category.symbol, color: category.color)
        }
        save(userDefaults: userDefaults)
    }

    func replaceTracks(_ newTracks: [RadioTrack], userDefaults: UserDefaults = .standard) {
        tracks = newTracks
        save(userDefaults: userDefaults)
    }

    /// Loads a small set of built-in sample tracks into the default collections
    /// synchronously, without any network, account, or persistence dependency.
    /// Used for deterministic UI-test / screenshot launches so the collection
    /// grid and track tiles are populated even with no connectivity.
    func loadOfflineDefaults() {
        categories = defaultRadioCategories
        tracks = Self.offlineSampleTracks
        selectedCategoryID = nil
    }

    /// First-party content only: every sample track is from the Tiko-owned
    /// "Tomato Bird" YouTube channel, so the thumbnails are safe to ship in
    /// App Store screenshots (third-party artwork would not be).
    static let offlineSampleTracks: [RadioTrack] = [
        RadioTrack(
            title: "Tomato Bird",
            artist: "Tomato Bird",
            source: .youtube,
            youtubeVideoId: "ROtWkfulLSI",
            thumbnailUrl: "https://img.youtube.com/vi/ROtWkfulLSI/hqdefault.jpg",
            categoryId: "animals"
        ),
        RadioTrack(
            title: "Cheeky Lily",
            artist: "Tomato Bird",
            source: .youtube,
            youtubeVideoId: "6B9wNRI4IH4",
            thumbnailUrl: "https://img.youtube.com/vi/6B9wNRI4IH4/hqdefault.jpg",
            categoryId: "animals"
        ),
        RadioTrack(
            title: "Go Go Dodo",
            artist: "Tomato Bird",
            source: .youtube,
            youtubeVideoId: "7hnP1nmk0FU",
            thumbnailUrl: "https://img.youtube.com/vi/7hnP1nmk0FU/hqdefault.jpg",
            categoryId: "music"
        ),
        RadioTrack(
            title: "Beatle Beast",
            artist: "Tomato Bird",
            source: .youtube,
            youtubeVideoId: "aLrgbWPfZ80",
            thumbnailUrl: "https://img.youtube.com/vi/aLrgbWPfZ80/hqdefault.jpg",
            categoryId: "music"
        ),
        RadioTrack(
            title: "Stomp",
            artist: "Tomato Bird",
            source: .youtube,
            youtubeVideoId: "OVx7cH5ais4",
            thumbnailUrl: "https://img.youtube.com/vi/OVx7cH5ais4/hqdefault.jpg",
            categoryId: "music"
        ),
        RadioTrack(
            title: "The Fix",
            artist: "Tomato Bird",
            source: .youtube,
            youtubeVideoId: "jqHFqZBFySc",
            thumbnailUrl: "https://img.youtube.com/vi/jqHFqZBFySc/hqdefault.jpg",
            categoryId: "music"
        ),
        RadioTrack(
            title: "Lumo",
            artist: "Tomato Bird",
            source: .youtube,
            youtubeVideoId: "Kw_nHvspuA0",
            thumbnailUrl: "https://img.youtube.com/vi/Kw_nHvspuA0/hqdefault.jpg",
            categoryId: "calm"
        )
    ]

    private func uniqueCategoryID(_ base: String) -> String {
        var candidate = base
        var suffix = 2
        let ids = Set(categories.map(\.id))
        while ids.contains(candidate) {
            candidate = "\(base)-\(suffix)"
            suffix += 1
        }
        return candidate
    }
}

let defaultUncategorizedCategoryID = "uncategorized"

let defaultRadioCategories: [RadioCategory] = [
    RadioCategory(id: "animals", title: "Animals", symbol: "pawprint.fill", color: "yellow"),
    RadioCategory(id: "stories", title: "Stories", symbol: "book.fill", color: "purple"),
    RadioCategory(id: "music", title: "Music", symbol: "music.note", color: "orange"),
    RadioCategory(id: "calm", title: "Calm", symbol: "moon.stars.fill", color: "blue"),
    RadioCategory(id: "favorites", title: "Favorites", symbol: "star.fill", color: "gold"),
    RadioCategory(id: defaultUncategorizedCategoryID, title: "Unsorted", symbol: "tray.fill", color: "lime")
]

private let defaultCategoryColors: [String] = [
    "yellow",
    "purple",
    "orange",
    "blue",
    "lime",
    "red"
]

protocol RadioSyncClient {
    func fetchLibrary() async throws -> RadioLibrarySnapshot
    func pushLibrary(_ snapshot: RadioLibrarySnapshot) async throws
}
