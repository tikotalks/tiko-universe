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

    /// The locale Tiko speaks `appLanguageCode` in.
    ///
    /// A regional code is normalised and kept (`pt_br` -> `pt-BR`). A bare
    /// language Tiko ships gets its canonical tag from `TikoSpeechLanguage`.
    /// Anything else is returned as itself — never silently rewritten to
    /// `en-US`, which is what made Armenian speak English.
    public static func languageCode(for appLanguageCode: String) -> String {
        let parts = appLanguageCode
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "_", with: "-")
            .split(separator: "-")
            .map(String.init)
        guard let base = parts.first?.lowercased(), !base.isEmpty else {
            return TikoSpeechLanguage.en.locale
        }
        if parts.count >= 2 {
            return "\(base)-\(parts[1].uppercased())"
        }
        return TikoSpeechLanguage(rawValue: base)?.locale ?? base
    }

    /// The best `AVSpeechSynthesizer` voice this device has for a language, or
    /// `nil` when it has none.
    ///
    /// `nil` is a real answer, not an edge case: Apple has never shipped a
    /// Maltese or Armenian voice, so on-device synthesis cannot speak either
    /// language. Callers must surface that rather than let the synthesizer
    /// read the text in whatever voice it defaults to.
    public static func systemVoice(for appLanguageCode: String) -> AVSpeechSynthesisVoice? {
        let installed = AVSpeechSynthesisVoice.speechVoices()
        for candidate in voiceCandidates(for: appLanguageCode) {
            if let match = installed.first(where: { $0.language.caseInsensitiveCompare(candidate) == .orderedSame }) {
                return match
            }
        }
        // Last resort: another region of the same language (a Belgian Dutch
        // voice still speaks Dutch). Never crosses into another language.
        guard let base = TikoSpeechLanguage.baseCode(of: appLanguageCode) else { return nil }
        return installed.first { $0.language.lowercased().hasPrefix("\(base)-") }
    }

    /// Whether this device can speak the language on its own, with no network.
    public static func hasSystemVoice(for appLanguageCode: String) -> Bool {
        systemVoice(for: appLanguageCode) != nil
    }

    private static func voiceCandidates(for appLanguageCode: String) -> [String] {
        let requested = languageCode(for: appLanguageCode)
        guard let language = TikoSpeechLanguage.resolve(appLanguageCode) else { return [requested] }
        // A caller that asked for a specific region gets it tried first.
        return language.localeCandidates.contains(requested)
            ? language.localeCandidates
            : [requested] + language.localeCandidates
    }
}

@MainActor
public enum TikoSpeechPlaybackState {
    case idle
    case generating
    case playing
    /// Nothing on this device can speak the requested language and no audio
    /// could be fetched — the UI must say so rather than stay silent.
    case unsupportedLanguage
}
