import TikoKit

@MainActor
enum YesNoSpeechPlaybackState {
    case idle
    case generating
    case playing
    case unsupportedLanguage
}

@MainActor
final class YesNoSpeechService {
    private let voice = TikoVoiceService()

    func speak(_ text: String, languageCode: String = "en", onStateChange: ((YesNoSpeechPlaybackState) -> Void)? = nil) {
        voice.speakDetached(text, languageCode: languageCode) { state in
            onStateChange?(YesNoSpeechPlaybackState(state))
        }
    }

    func stop() {
        voice.stop()
    }
}

private extension YesNoSpeechPlaybackState {
    init(_ state: TikoSpeechPlaybackState) {
        switch state {
        case .idle: self = .idle
        case .generating: self = .generating
        case .playing: self = .playing
        case .unsupportedLanguage: self = .unsupportedLanguage
        }
    }
}
