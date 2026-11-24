import XCTest
import TikoKit

/// Integration check for the Atlas voice pipeline: with a device session,
/// prefetching a word must produce cached audio on disk (that cache is what
/// makes playback work offline). Skips when the network or identity service
/// is unreachable so offline test runs stay green.
@MainActor
final class TikoVoiceServiceTests: XCTestCase {
    func testPrefetchCachesAtlasAudioForOfflineUse() async throws {
        // The voice service reads the session token from the shared device
        // session store; bootstrap one if this test host has none yet.
        if (try? TikoDeviceSessionStore().load()?.accessToken) == nil {
            TikoIdentityClient.identityBaseURL = "https://identity.tikoapi.org/v1"
            guard let bundle = try? await TikoIdentityClient().bootstrapDevice(name: "tikokit-tests", platform: "ios") else {
                throw XCTSkip("identity service unreachable — skipping Atlas integration check")
            }
            try? TikoDeviceSessionStore().save(bundle)
        }

        let service = TikoVoiceService()
        let word = "Dog"
        await service.prefetch(texts: [word], languageCode: "en")

        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let cacheDir = base.appending(path: "TikoVoiceCache", directoryHint: .isDirectory)
        let cached = (try? FileManager.default.contentsOfDirectory(at: cacheDir, includingPropertiesForKeys: [.fileSizeKey])) ?? []
        guard !cached.isEmpty else {
            throw XCTSkip("Atlas speech unreachable — skipping (playback falls back to the on-device voice)")
        }
        let sizes = cached.compactMap { try? $0.resourceValues(forKeys: [.fileSizeKey]).fileSize }
        XCTAssertTrue(sizes.contains { $0 > 1000 }, "cached Atlas audio should be a real audio file")
    }

    /// A `speak` that is still waiting on Atlas when a newer one starts used to
    /// wake up afterwards, take over the shared player and report its progress
    /// to the newer call's handler — which left that call's button stuck on
    /// "playing". The older call must end where it is and say nothing more.
    func testSupersededSpeakLeavesTheNewerCallAlone() async throws {
        SlowFirstAtlasStub.reset()
        URLProtocol.registerClass(SlowFirstAtlasStub.self)
        defer { URLProtocol.unregisterClass(SlowFirstAtlasStub.self) }

        let voice = TikoVoiceService()
        var first: [TikoSpeechPlaybackState] = []
        var second: [TikoSpeechPlaybackState] = []

        // Unique texts, so neither is answered from the audio cache.
        let older = voice.speakDetached("older \(UUID().uuidString)", languageCode: "en") { first.append($0) }
        try await Task.sleep(nanoseconds: 100_000_000)
        voice.speakDetached("newer \(UUID().uuidString)", languageCode: "en") { second.append($0) }

        // Long enough for the older call's slow request to come back while the
        // newer one is speaking.
        try await Task.sleep(nanoseconds: 900_000_000)
        voice.stop()
        await older.value

        XCTAssertEqual(first, [.generating, .idle], "the older call ends when it is superseded")
        XCTAssertEqual(second, [.generating, .playing, .idle], "the newer call hears only about itself")
        XCTAssertFalse(voice.isSpeaking)
    }
}

/// Answers Atlas speech requests with a failure: the first one after a delay,
/// the rest at once. That is a weak connection followed by a second tap.
private final class SlowFirstAtlasStub: URLProtocol {
    private static let lock = NSLock()
    private static var served = 0

    static func reset() {
        lock.lock()
        served = 0
        lock.unlock()
    }

    override class func canInit(with request: URLRequest) -> Bool {
        request.url?.path.hasSuffix("/atlas/speech") == true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        Self.lock.lock()
        let isFirst = Self.served == 0
        Self.served += 1
        Self.lock.unlock()

        let respond = { [self] in
            let response = HTTPURLResponse(url: request.url!, statusCode: 503, httpVersion: nil, headerFields: nil)!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocolDidFinishLoading(self)
        }
        if isFirst {
            DispatchQueue.global().asyncAfter(deadline: .now() + 0.6, execute: respond)
        } else {
            respond()
        }
    }

    override func stopLoading() {}
}
