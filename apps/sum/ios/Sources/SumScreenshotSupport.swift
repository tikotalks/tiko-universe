import Foundation
import TikoKit

/// Deterministic speech stand-in for App Store screenshot capture
/// (`--screenshot-mode`). Permissions read as granted, playback returns
/// immediately, listening never starts. With the `celebrate` scene the play
/// view model still advances because answers are tapped by the child — the
/// scene simply lands on the choosing state, which is the money shot.
@MainActor
final class SumScreenshotSpeechService: TikoSpeechServicing {
    var onAudioLevel: ((Float) -> Void)?

    func permissionState() -> TikoPermissionState { .granted }
    func requestPermissions() async -> Bool { true }
    func recognitionAvailability(languageCode: String) -> TikoRecognitionAvailability { .available(onDevice: true) }
    func speak(_ text: String, languageCode: String) async {}
    func prefetch(texts: [String], languageCode: String) async {}
    func listen(languageCode: String, contextualWords: [String], timeout: TimeInterval) -> AsyncStream<TikoTranscriptUpdate> {
        AsyncStream { _ in }
    }
    func stopListening() {}
    func stopAll() {}
}
