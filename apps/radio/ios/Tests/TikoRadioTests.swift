import XCTest
@testable import TikoRadio
import TikoKit

/// Requirements-based unit tests for Tiko Radio.
///
/// These cover the testable logic: the track / collection model and its JSON
/// round-trip, the YouTube video-id parser, the `RadioLibraryStore` persistence
/// and management (add / rename / move / delete, offline defaults), the pure
/// `RadioQueue` navigation logic (advance / rewind / shuffle / wrap-around), and
/// the playback service's initial and transition state.
/// See `REQUIREMENTS.md` for the requirement each test maps to.
final class TikoRadioTests: XCTestCase {

    func testAppColorsExist() {
        let palette = TikoAppColor.radio.palette
        XCTAssertEqual(palette.label, "Radio")
    }

    // MARK: - Track model (Req 1)

    func testRadioTrackInitDefaults() {
        let track = RadioTrack(title: "Song", source: .youtube, youtubeVideoId: "abc123XYZ")
        XCTAssertFalse(track.id.isEmpty, "a track gets a generated id")
        XCTAssertNil(track.artist)
        XCTAssertNil(track.categoryId)
        XCTAssertNotNil(track.addedAt, "addedAt defaults to now (ISO-8601)")
    }

    func testRadioTracksRoundTripJSON() throws {
        let tracks = [
            RadioTrack(title: "Song", artist: "Artist", source: .youtube, youtubeVideoId: "abc123XYZ")
        ]
        let data = try JSONEncoder().encode(tracks)
        let decoded = try JSONDecoder().decode([RadioTrack].self, from: data)
        XCTAssertEqual(decoded, tracks)
    }

    func testWithCategoryPreservesFields() {
        let track = RadioTrack(title: "Song", artist: "Artist", source: .youtube, youtubeVideoId: "abc123XYZ")
        let moved = track.withCategory("music")
        XCTAssertEqual(moved.categoryId, "music")
        XCTAssertEqual(moved.id, track.id)
        XCTAssertEqual(moved.title, track.title)
        XCTAssertEqual(moved.artist, track.artist)
    }

    // MARK: - YouTube id parser (Req 2)

    func testYouTubeVideoIDParserHandlesPlainID() {
        XCTAssertEqual(YouTubeVideoIDParser.parse("abc123XYZ"), "abc123XYZ")
    }

    func testYouTubeVideoIDParserHandlesWatchURL() {
        XCTAssertEqual(YouTubeVideoIDParser.parse("https://www.youtube.com/watch?v=abc123XYZ&t=12"), "abc123XYZ")
    }

    func testYouTubeVideoIDParserHandlesShortURL() {
        XCTAssertEqual(YouTubeVideoIDParser.parse("https://youtu.be/abc123XYZ"), "abc123XYZ")
    }

    func testYouTubeVideoIDParserHandlesShortsURL() {
        XCTAssertEqual(YouTubeVideoIDParser.parse("https://www.youtube.com/shorts/abc123XYZ"), "abc123XYZ")
    }

    // MARK: - Collection model & catalog (Req 3, 4, 5)

    /// Req 4: the built-in collection catalog is present with the expected ids.
    func testDefaultCollectionsCatalog() {
        let ids = defaultRadioCategories.map(\.id)
        for expected in ["animals", "stories", "music", "calm", "favorites", defaultUncategorizedCategoryID] {
            XCTAssertTrue(ids.contains(expected), "default collections should include '\(expected)'")
        }
        // Each collection is renderable: non-empty title, symbol and colour.
        for category in defaultRadioCategories {
            XCTAssertFalse(category.title.isEmpty)
            XCTAssertFalse(category.symbol.isEmpty)
            XCTAssertFalse(category.color.isEmpty)
        }
    }

    /// Req 3: a track added without a collection is filed under "Unsorted".
    @MainActor
    func testAddTrackDefaultsToUncategorized() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        store.addTrack(RadioTrack(title: "Song", source: .youtube, youtubeVideoId: "abc"), userDefaults: defaults)
        XCTAssertEqual(store.tracks.first?.categoryId, defaultUncategorizedCategoryID)
    }

    /// Req 5: tracks can be filtered by collection and counted.
    @MainActor
    func testTracksFilteredByCollection() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        store.addTrack(RadioTrack(title: "A", source: .youtube, youtubeVideoId: "a", categoryId: "music"), userDefaults: defaults)
        store.addTrack(RadioTrack(title: "B", source: .youtube, youtubeVideoId: "b", categoryId: "music"), userDefaults: defaults)
        store.addTrack(RadioTrack(title: "C", source: .youtube, youtubeVideoId: "c", categoryId: "animals"), userDefaults: defaults)
        XCTAssertEqual(store.tracks(in: "music").count, 2)
        XCTAssertEqual(store.tracks(in: "animals").count, 1)
        XCTAssertEqual(store.tracks(in: nil).count, 3, "nil collection returns all tracks")
    }

    // MARK: - Store persistence & management (Req 6, 7)

    @MainActor
    func testRadioLibraryStorePersistsTracks() {
        let suiteName = "TikoRadioTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }

        let store = RadioLibraryStore()
        store.replaceTracks([], userDefaults: defaults)
        store.addTrack(RadioTrack(title: "Song", artist: "Artist", source: .youtube, youtubeVideoId: "abc123XYZ"), userDefaults: defaults)

        let reloaded = RadioLibraryStore()
        reloaded.load(userDefaults: defaults)
        XCTAssertEqual(reloaded.tracks.count, 1)
        XCTAssertEqual(reloaded.tracks.first?.title, "Song")
    }

    @MainActor
    func testRadioLibraryStorePersistsCollectionsAndMovesTracks() {
        let suiteName = "TikoRadioTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }

        let store = RadioLibraryStore()
        store.replaceTracks([], userDefaults: defaults)
        let collection = store.addCategory(title: "Bedtime", userDefaults: defaults)
        let track = RadioTrack(title: "Sleep Song", source: .youtube, youtubeVideoId: "abc123XYZ", categoryId: collection.id)
        store.addTrack(track, userDefaults: defaults)
        store.renameCategory(id: collection.id, title: "Sleep", userDefaults: defaults)
        store.renameTrack(id: track.id, title: "Moon Song", userDefaults: defaults)

        let reloaded = RadioLibraryStore()
        reloaded.load(userDefaults: defaults)
        XCTAssertEqual(reloaded.categories.first(where: { $0.id == collection.id })?.title, "Sleep")
        XCTAssertEqual(reloaded.tracks(in: collection.id).first?.title, "Moon Song")
    }

    /// Req 7: a new collection gets a unique id even when the title collides.
    @MainActor
    func testAddCategoryAssignsUniqueIdAndColor() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        let first = store.addCategory(title: "Bedtime", userDefaults: defaults)
        let second = store.addCategory(title: "Bedtime", userDefaults: defaults)
        XCTAssertNotEqual(first.id, second.id, "colliding titles must get distinct ids")
        XCTAssertFalse(first.color.isEmpty)
    }

    /// Req 7: deleting a collection re-files its tracks to "Unsorted".
    @MainActor
    func testRemoveCollectionRefilesTracks() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        let collection = store.addCategory(title: "Bedtime", userDefaults: defaults)
        let track = RadioTrack(title: "Sleep Song", source: .youtube, youtubeVideoId: "abc", categoryId: collection.id)
        store.addTrack(track, userDefaults: defaults)
        store.removeCategory(id: collection.id, userDefaults: defaults)
        XCTAssertFalse(store.categories.contains { $0.id == collection.id })
        XCTAssertEqual(store.tracks.first(where: { $0.id == track.id })?.categoryId, defaultUncategorizedCategoryID)
    }

    /// The offline-defaults path used for UI tests / screenshots populates the
    /// grid with sample tracks and the built-in collections, with no persistence.
    @MainActor
    func testOfflineDefaultsPopulateGrid() {
        let store = RadioLibraryStore()
        store.loadOfflineDefaults()
        XCTAssertFalse(store.tracks.isEmpty, "offline defaults should populate sample tracks")
        XCTAssertFalse(store.tracks(in: "music").isEmpty, "the Music collection should have sample tracks")
        XCTAssertEqual(store.categories.map(\.id), defaultRadioCategories.map(\.id))
    }

    // MARK: - Playback queue (Req 11, 12, 13)

    /// Req 11: linear skip-forward advances and wraps around the end.
    func testQueueAdvanceWrapsAround() {
        XCTAssertEqual(RadioQueue.advance(current: 0, count: 3, shuffle: false), 1)
        XCTAssertEqual(RadioQueue.advance(current: 1, count: 3, shuffle: false), 2)
        XCTAssertEqual(RadioQueue.advance(current: 2, count: 3, shuffle: false), 0, "advancing past the last track wraps to the first")
    }

    /// Req 11: linear skip-back wraps from the first track to the last.
    func testQueueRewindWrapsAround() {
        XCTAssertEqual(RadioQueue.rewind(current: 2, count: 3, shuffle: false), 1)
        XCTAssertEqual(RadioQueue.rewind(current: 1, count: 3, shuffle: false), 0)
        XCTAssertEqual(RadioQueue.rewind(current: 0, count: 3, shuffle: false), 2, "rewinding before the first track wraps to the last")
    }

    /// Req 13: an empty queue yields no index.
    func testQueueEmptyReturnsNil() {
        XCTAssertNil(RadioQueue.advance(current: 0, count: 0, shuffle: false))
        XCTAssertNil(RadioQueue.rewind(current: 0, count: 0, shuffle: true))
    }

    /// Req 13: a single-track queue always resolves to that one track.
    func testQueueSingleTrack() {
        XCTAssertEqual(RadioQueue.advance(current: 0, count: 1, shuffle: false), 0)
        XCTAssertEqual(RadioQueue.advance(current: 0, count: 1, shuffle: true), 0)
        XCTAssertEqual(RadioQueue.rewind(current: 0, count: 1, shuffle: true), 0)
    }

    /// Req 12: shuffle always returns an in-range index.
    func testQueueShuffleStaysInRange() {
        var rng = SeededGenerator(seed: 42)
        for _ in 0..<200 {
            let index = RadioQueue.advance(current: 0, count: 5, shuffle: true, using: &rng)
            XCTAssertNotNil(index)
            XCTAssertTrue((0..<5).contains(index!), "shuffle index \(index!) out of range")
        }
    }

    /// Req 12: shuffle is deterministic given the same seeded generator.
    func testQueueShuffleIsDeterministicWithSeededGenerator() {
        var a = SeededGenerator(seed: 7)
        var b = SeededGenerator(seed: 7)
        let seqA = (0..<10).map { _ in RadioQueue.advance(current: 0, count: 8, shuffle: true, using: &a) }
        let seqB = (0..<10).map { _ in RadioQueue.advance(current: 0, count: 8, shuffle: true, using: &b) }
        XCTAssertEqual(seqA, seqB)
    }

    // MARK: - Playback service state (Req 9, 14)

    @MainActor
    func testPlaybackServiceStartsIdle() {
        let playback = RadioPlaybackService()
        XCTAssertFalse(playback.isPlaying)
        XCTAssertFalse(playback.hasCurrentTrack)
        XCTAssertEqual(playback.progress, 0)
    }

    /// Req 14: pause and stop leave the service in a safe, reset state even when
    /// no track was ever playing (no crash, progress stays zero).
    @MainActor
    func testPlaybackPauseAndStopResetState() {
        let playback = RadioPlaybackService()
        playback.pause()
        XCTAssertFalse(playback.isPlaying)
        playback.stop()
        XCTAssertFalse(playback.isPlaying)
        XCTAssertFalse(playback.hasCurrentTrack)
        XCTAssertEqual(playback.progress, 0)
    }

    // MARK: - Track model & sources (Req 1)

    /// `withCategory(nil)` clears the collection while preserving identity.
    func testWithCategoryNilClearsCollection() {
        let track = RadioTrack(title: "Song", source: .youtube, youtubeVideoId: "abc", categoryId: "music")
        let cleared = track.withCategory(nil)
        XCTAssertNil(cleared.categoryId)
        XCTAssertEqual(cleared.id, track.id)
        XCTAssertEqual(cleared.title, track.title)
    }

    /// A caller-supplied `addedAt` is preserved (not overwritten by "now").
    func testRadioTrackPreservesSuppliedAddedAt() {
        let stamp = "2020-01-02T03:04:05Z"
        let track = RadioTrack(title: "Song", source: .youtube, youtubeVideoId: "abc", addedAt: stamp)
        XCTAssertEqual(track.addedAt, stamp)
    }

    func testTrackSourceRawValues() {
        XCTAssertEqual(TrackSource.youtube.rawValue, "youtube")
        XCTAssertEqual(TrackSource.r2.rawValue, "r2")
        XCTAssertEqual(TrackSource.upload.rawValue, "upload")
        XCTAssertEqual(TrackSource(rawValue: "youtube"), .youtube)
        XCTAssertNil(TrackSource(rawValue: "spotify"))
    }

    func testCategoryColorNameMirrorsColor() {
        let category = RadioCategory(id: "x", title: "X", symbol: "star.fill", color: "blue")
        XCTAssertEqual(category.colorName, "blue")
    }

    /// The full library snapshot (tracks + collections + selection) round-trips through JSON.
    func testRadioLibrarySnapshotRoundTripsJSON() throws {
        let snapshot = RadioLibrarySnapshot(
            tracks: [RadioTrack(title: "S", source: .youtube, youtubeVideoId: "abc", categoryId: "music")],
            categories: defaultRadioCategories,
            selectedCategoryID: "music"
        )
        let data = try JSONEncoder().encode(snapshot)
        let decoded = try JSONDecoder().decode(RadioLibrarySnapshot.self, from: data)
        XCTAssertEqual(decoded, snapshot)
    }

    // MARK: - YouTube id parser — remaining forms (Req 2)

    func testYouTubeVideoIDParserHandlesEmbedURL() {
        XCTAssertEqual(YouTubeVideoIDParser.parse("https://www.youtube.com/embed/abc123XYZ"), "abc123XYZ")
    }

    func testYouTubeVideoIDParserHandlesLiveURL() {
        XCTAssertEqual(YouTubeVideoIDParser.parse("https://www.youtube.com/live/abc123XYZ"), "abc123XYZ")
    }

    func testYouTubeVideoIDParserTrimsWhitespace() {
        XCTAssertEqual(YouTubeVideoIDParser.parse("  abc123XYZ  "), "abc123XYZ")
    }

    func testYouTubeVideoIDParserReturnsInputForNonYouTubeURL() {
        let other = "https://example.com/watch?v=abc123XYZ"
        XCTAssertEqual(YouTubeVideoIDParser.parse(other), other, "a non-YouTube URL is returned unchanged")
    }

    func testYouTubeVideoIDParserHandlesEmptyString() {
        XCTAssertEqual(YouTubeVideoIDParser.parse(""), "")
    }

    // MARK: - Store computed views (Req 3, 5)

    @MainActor
    func testSelectedCategoryReturnsMatchingCategory() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        XCTAssertNil(store.selectedCategory, "no selection ⇒ nil")
        store.selectedCategoryID = "music"
        XCTAssertEqual(store.selectedCategory?.title, "Music")
        store.selectedCategoryID = "does-not-exist"
        XCTAssertNil(store.selectedCategory, "unknown id ⇒ nil")
    }

    /// `collectionsWithTracks` hides empty collections but keeps the selected one visible.
    @MainActor
    func testCollectionsWithTracksHidesEmptyButKeepsSelected() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        store.addTrack(RadioTrack(title: "A", source: .youtube, youtubeVideoId: "a", categoryId: "music"), userDefaults: defaults)
        var ids = store.collectionsWithTracks.map(\.id)
        XCTAssertTrue(ids.contains("music"), "a collection with tracks is shown")
        XCTAssertFalse(ids.contains("animals"), "an empty collection is hidden")
        store.selectedCategoryID = "animals"
        ids = store.collectionsWithTracks.map(\.id)
        XCTAssertTrue(ids.contains("animals"), "the selected collection stays visible even when empty")
    }

    // MARK: - Store management — remaining paths (Req 6, 7)

    @MainActor
    func testRemoveTrackDeletesTrack() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        let track = RadioTrack(title: "A", source: .youtube, youtubeVideoId: "a", categoryId: "music")
        store.addTrack(track, userDefaults: defaults)
        XCTAssertEqual(store.tracks.count, 1)
        store.removeTrack(id: track.id, userDefaults: defaults)
        XCTAssertTrue(store.tracks.isEmpty)
    }

    @MainActor
    func testMoveTrackChangesCollectionAndPersists() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        let track = RadioTrack(title: "A", source: .youtube, youtubeVideoId: "a", categoryId: "music")
        store.addTrack(track, userDefaults: defaults)
        store.moveTrack(track, to: "animals", userDefaults: defaults)
        XCTAssertEqual(store.tracks.first?.categoryId, "animals")

        let reloaded = RadioLibraryStore()
        reloaded.load(userDefaults: defaults)
        XCTAssertEqual(reloaded.tracks.first?.categoryId, "animals", "the move is persisted")

        store.moveTrack(track, to: nil, userDefaults: defaults)
        XCTAssertNil(store.tracks.first?.categoryId, "a track can be moved out of every collection")
    }

    @MainActor
    func testRenameTrackIgnoresBlankTitle() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        let track = RadioTrack(title: "Keep Me", source: .youtube, youtubeVideoId: "a", categoryId: "music")
        store.addTrack(track, userDefaults: defaults)
        store.renameTrack(id: track.id, title: "   ", userDefaults: defaults)
        XCTAssertEqual(store.tracks.first?.title, "Keep Me", "a blank title is ignored")
    }

    @MainActor
    func testRenameCategoryIgnoresBlankTitle() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        let collection = store.addCategory(title: "Bedtime", userDefaults: defaults)
        store.renameCategory(id: collection.id, title: "   ", userDefaults: defaults)
        XCTAssertEqual(store.categories.first { $0.id == collection.id }?.title, "Bedtime", "a blank title is ignored")
    }

    /// Adding a collection auto-selects it (so the Add sheet targets the new one).
    @MainActor
    func testAddCategorySelectsNewCollection() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        let collection = store.addCategory(title: "Bedtime", userDefaults: defaults)
        XCTAssertEqual(store.selectedCategoryID, collection.id)
    }

    /// Deleting the currently-selected collection clears the selection.
    @MainActor
    func testRemoveSelectedCategoryClearsSelection() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        let collection = store.addCategory(title: "Bedtime", userDefaults: defaults)
        XCTAssertEqual(store.selectedCategoryID, collection.id)
        store.removeCategory(id: collection.id, userDefaults: defaults)
        XCTAssertNil(store.selectedCategoryID, "removing the selected collection clears the selection")
    }

    @MainActor
    func testReplaceTracksReplacesEntireLibrary() {
        let (store, defaults, suite) = makeStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        store.addTrack(RadioTrack(title: "A", source: .youtube, youtubeVideoId: "a", categoryId: "music"), userDefaults: defaults)
        store.replaceTracks([
            RadioTrack(title: "X", source: .youtube, youtubeVideoId: "x", categoryId: "calm"),
            RadioTrack(title: "Y", source: .youtube, youtubeVideoId: "y", categoryId: "calm")
        ], userDefaults: defaults)
        XCTAssertEqual(store.tracks.map(\.title), ["X", "Y"])
    }

    /// Legacy migration: a bare `radio.tracks` array is upgraded to the v2 snapshot,
    /// with untagged tracks filed under "Unsorted".
    @MainActor
    func testLegacyTrackArrayMigratesToSnapshot() throws {
        let suite = "TikoRadioTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let legacy = [RadioTrack(title: "Old Song", source: .youtube, youtubeVideoId: "abc")]
        defaults.set(try JSONEncoder().encode(legacy), forKey: "radio.tracks")

        let store = RadioLibraryStore()
        store.load(userDefaults: defaults)
        XCTAssertEqual(store.tracks.count, 1)
        XCTAssertEqual(store.tracks.first?.categoryId, defaultUncategorizedCategoryID, "legacy tracks are filed under Unsorted")
        XCTAssertNotNil(defaults.data(forKey: "radio.library.snapshot.v2"), "migration writes the v2 snapshot")
    }

    /// A snapshot that stored no collections falls back to the built-in defaults on load.
    @MainActor
    func testLoadRestoresDefaultCategoriesWhenSnapshotHasNone() throws {
        let suite = "TikoRadioTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let snapshot = RadioLibrarySnapshot(tracks: [], categories: [], selectedCategoryID: nil)
        defaults.set(try JSONEncoder().encode(snapshot), forKey: "radio.library.snapshot.v2")

        let store = RadioLibraryStore()
        store.load(userDefaults: defaults)
        XCTAssertEqual(store.categories.map(\.id), defaultRadioCategories.map(\.id))
    }

    // MARK: - Playback queue — remaining shuffle path (Req 12)

    /// Req 12: shuffle rewind also always returns an in-range index.
    func testQueueRewindShuffleStaysInRange() {
        var rng = SeededGenerator(seed: 99)
        for _ in 0..<200 {
            let index = RadioQueue.rewind(current: 0, count: 6, shuffle: true, using: &rng)
            XCTAssertNotNil(index)
            XCTAssertTrue((0..<6).contains(index!), "shuffle rewind index \(index!) out of range")
        }
    }

    // MARK: - Playback service — playing a track (Req 9, 14)

    /// Playing a track marks the service playing with a current track; pause keeps
    /// the track, resume re-arms, and stop fully resets. Uses a local (upload)
    /// source URL so the AVPlayer state machine is exercised with no network — the
    /// YouTube branch is covered separately without loading the embed page.
    @MainActor
    func testPlaybackPlayPauseResumeStopLifecycle() {
        let playback = RadioPlaybackService()
        let track = RadioTrack(title: "Song", source: .upload, audioUrl: "file:///tmp/does-not-exist.m4a")
        playback.play(track)
        XCTAssertTrue(playback.isPlaying)
        XCTAssertTrue(playback.hasCurrentTrack)
        XCTAssertEqual(playback.currentTrack?.id, track.id)

        playback.pause()
        XCTAssertFalse(playback.isPlaying)
        XCTAssertTrue(playback.hasCurrentTrack, "pause keeps the current track")

        playback.resume()
        XCTAssertTrue(playback.isPlaying, "resume re-arms playback for the retained YouTube track")

        playback.stop()
        XCTAssertFalse(playback.isPlaying)
        XCTAssertFalse(playback.hasCurrentTrack)
        XCTAssertEqual(playback.progress, 0)
    }

    /// A YouTube track with no video id is a no-op (no crash, stays idle).
    @MainActor
    func testPlaybackIgnoresYouTubeTrackWithoutVideoId() {
        let playback = RadioPlaybackService()
        playback.play(RadioTrack(title: "Broken", source: .youtube, youtubeVideoId: nil))
        XCTAssertFalse(playback.isPlaying)
    }

    // MARK: - Helpers

    @MainActor
    private func makeStore() -> (RadioLibraryStore, UserDefaults, String) {
        let suite = "TikoRadioTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        let store = RadioLibraryStore()
        store.replaceTracks([], userDefaults: defaults)
        return (store, defaults, suite)
    }
}

/// A tiny deterministic RNG so shuffle behaviour is reproducible in tests.
private struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64
    init(seed: UInt64) { state = seed &+ 0x9E3779B97F4A7C15 }
    mutating func next() -> UInt64 {
        // SplitMix64
        state = state &+ 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}
