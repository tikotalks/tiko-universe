import TikoKit

@MainActor
final class TalkSpeechService {
    private let voice = TikoVoiceService()

    func speak(_ text: String, languageCode: String = "en") {
        voice.speakDetached(text, languageCode: languageCode)
    }

    func stop() {
        voice.stop()
    }
}
