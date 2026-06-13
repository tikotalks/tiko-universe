import TikoKit

@MainActor
enum YesNoSpeechPlaybackState {
    case idle
    case generating
    case playing
}

@MainActor
final class YesNoSpeechService {
    private let speechService = TikoAtlasSpeechService(app: "yes-no", purpose: "speech-playback")

    func speak(_ text: String, languageCode: String = "en", onStateChange: ((YesNoSpeechPlaybackState) -> Void)? = nil) {
        speechService.speak(text, languageCode: languageCode) { state in
            onStateChange?(YesNoSpeechPlaybackState(state))
        }
    }

    func stop() {
        speechService.stop()
    }
}

private extension YesNoSpeechPlaybackState {
    init(_ state: TikoSpeechPlaybackState) {
        switch state {
        case .idle: self = .idle
        case .generating: self = .generating
        case .playing: self = .playing
        }
    }
}
