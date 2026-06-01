import XCTest
@testable import TikoRadio
import TikoKit

final class TikoRadioTests: XCTestCase {
    func testAppColorsExist() {
        let palette = TikoAppColor.radio.palette
        XCTAssertEqual(palette.label, "Radio")
    }

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

    func testRadioTracksRoundTripJSON() throws {
        let tracks = [
            RadioTrack(title: "Song", artist: "Artist", source: .youtube, youtubeVideoId: "abc123XYZ")
        ]
        let data = try JSONEncoder().encode(tracks)
        let decoded = try JSONDecoder().decode([RadioTrack].self, from: data)
        XCTAssertEqual(decoded, tracks)
    }

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

    @MainActor
    func testPlaybackServiceStartsIdle() {
        let playback = RadioPlaybackService()
        XCTAssertFalse(playback.isPlaying)
        XCTAssertFalse(playback.hasCurrentTrack)
        XCTAssertEqual(playback.progress, 0)
    }
}
