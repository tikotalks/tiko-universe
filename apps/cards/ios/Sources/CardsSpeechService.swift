import TikoKit

@MainActor
final class CardsSpeechService {
    private let voice = TikoVoiceService()

    func speak(_ text: String, languageCode: String = "en") {
        voice.speakDetached(text, languageCode: languageCode)
    }

    func stop() {
        voice.stop()
    }
}
