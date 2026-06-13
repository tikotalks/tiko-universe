import TikoKit

@MainActor
final class CardsSpeechService {
    private let speechService = TikoAtlasSpeechService(app: "cards", purpose: "card-speech")

    func speak(_ text: String, languageCode: String = "en-US") {
        speechService.speak(text, languageCode: languageCode)
    }

    func stop() {
        speechService.stop()
    }
}
