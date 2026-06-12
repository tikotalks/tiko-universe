import AVFoundation
import Foundation

public enum TikoSpeech {
    public static func configurePlaybackSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try session.setActive(true)
        } catch {
            // Speech should still attempt playback if the system refuses session changes.
        }
    }

    public static func languageCode(for appLanguageCode: String) -> String {
        let parts = appLanguageCode
            .replacingOccurrences(of: "_", with: "-")
            .split(separator: "-")
            .map(String.init)
        if parts.count >= 2 {
            return "\(parts[0].lowercased())-\(parts[1].uppercased())"
        }
        let normalized = parts.first?.lowercased() ?? "en"

        switch normalized {
        case "ar": return "ar-SA"
        case "de": return "de-DE"
        case "en": return "en-US"
        case "es": return "es-ES"
        case "fr": return "fr-FR"
        case "it": return "it-IT"
        case "ja": return "ja-JP"
        case "ko": return "ko-KR"
        case "mt": return "mt-MT"
        case "nl": return "nl-NL"
        case "pt": return "pt-PT"
        case "zh": return "zh-CN"
        default: return appLanguageCode.contains("-") ? appLanguageCode : "en-US"
        }
    }
}
