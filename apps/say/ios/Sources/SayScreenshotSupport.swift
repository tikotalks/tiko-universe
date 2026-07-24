import Foundation
import TikoKit

/// Deterministic speech stand-in for App Store screenshot capture
/// (`--screenshot-mode`, see `TikoScreenshotMode`). Permissions read as
/// granted, playback returns immediately and listening stays open so the
/// practice screen renders a stable "listening" state — no microphone, no
/// recognizer, no permission prompts during capture. With `autoMatch` (the
/// `celebrate` scene), every attempt succeeds after a short beat so promo
/// videos can capture the celebration loop hands-free.
@MainActor
final class ScreenshotSpeechService: SaySpeechServicing {
    var onAudioLevel: ((Float) -> Void)?

    private let autoMatch: Bool

    init(autoMatch: Bool = TikoScreenshotMode.scene == "celebrate") {
        self.autoMatch = autoMatch
    }

    func permissionState() -> SayPermissionState { .granted }

    func requestPermissions() async -> Bool { true }

    func recognitionAvailability(languageCode: String) -> SayRecognitionAvailability {
        .available(onDevice: true)
    }

    func speak(_ text: String, languageCode: String) async {}

    func prefetch(texts: [String], languageCode: String) async {}

    func listen(languageCode: String, contextualWords: [String], timeout: TimeInterval) -> AsyncStream<SayTranscriptUpdate> {
        guard autoMatch, let word = contextualWords.first else {
            return AsyncStream { _ in }
        }
        return AsyncStream { continuation in
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 1_200_000_000)
                continuation.yield(SayTranscriptUpdate(transcript: word, isFinal: false))
                continuation.finish()
            }
        }
    }

    func stopListening() {}

    func stopAll() {}
}
