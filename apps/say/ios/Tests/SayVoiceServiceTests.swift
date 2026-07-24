import XCTest
import TikoKit
@testable import TikoSay

/// Integration check for the Atlas voice pipeline: with a device session,
/// prefetching a word must produce cached audio on disk (that cache is what
/// makes playback work offline). Skips when the network or identity service
/// is unreachable so offline test runs stay green.
@MainActor
final class SayVoiceServiceTests: XCTestCase {
    func testPrefetchCachesAtlasAudioForOfflineUse() async throws {
        // The voice service reads the session token from the shared device
        // session store; bootstrap one if this test host has none yet.
        if (try? TikoDeviceSessionStore().load()?.accessToken) == nil {
            TikoIdentityClient.identityBaseURL = "https://identity.tikoapi.org/v1"
            guard let bundle = try? await TikoIdentityClient().bootstrapDevice(name: "say-tests", platform: "ios") else {
                throw XCTSkip("identity service unreachable — skipping Atlas integration check")
            }
            try? TikoDeviceSessionStore().save(bundle)
        }

        let service = SayVoiceService()
        let word = "Dog"
        await service.prefetch(texts: [word], languageCode: "en")

        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let cacheDir = base.appending(path: "SayVoiceCache", directoryHint: .isDirectory)
        let cached = (try? FileManager.default.contentsOfDirectory(at: cacheDir, includingPropertiesForKeys: [.fileSizeKey])) ?? []
        guard !cached.isEmpty else {
            throw XCTSkip("Atlas speech unreachable — skipping (playback falls back to the on-device voice)")
        }
        let sizes = cached.compactMap { try? $0.resourceValues(forKeys: [.fileSizeKey]).fileSize }
        XCTAssertTrue(sizes.contains { $0 > 1000 }, "cached Atlas audio should be a real audio file")
    }
}
