import Foundation
import TikoKit

/// Deterministic voice stand-in for App Store screenshot capture
/// (`--screenshot-mode`): playback returns immediately so the routine screen
/// settles into a predictable frame.
@MainActor
final class FirstScreenshotVoice: FirstSpeaking {
    func speak(_ text: String, languageCode: String) async {}
    func prefetch(texts: [String], languageCode: String) async {}
    func stop() {}
}
