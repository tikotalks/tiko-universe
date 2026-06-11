import AVFoundation

@MainActor
enum YesNoSpeechPlaybackState {
    case idle
    case generating
    case playing
}

@MainActor
final class YesNoSpeechService: NSObject, AVAudioPlayerDelegate, AVSpeechSynthesizerDelegate {
    private let synthesizer = AVSpeechSynthesizer()
    private let atlasSpeechURL = URL(string: "https://api.tikotalks.com/v1/atlas/speech")!
    private var audioPlayer: AVAudioPlayer?
    private var speechTask: Task<Void, Never>?
    private var stateHandler: ((YesNoSpeechPlaybackState) -> Void)?

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func speak(_ text: String, languageCode: String = "en", onStateChange: ((YesNoSpeechPlaybackState) -> Void)? = nil) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        stop()
        stateHandler = onStateChange
        notify(.generating)

        speechTask = Task { [atlasSpeechURL] in
            do {
                let locale = speechLocale(for: languageCode)
                let audioURL = try await fetchAtlasAudioURL(text: trimmed, languageCode: locale, atlasSpeechURL: atlasSpeechURL)
                let (audioData, response) = try await URLSession.shared.data(from: audioURL)
                guard !Task.isCancelled else { return }
                guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                    throw SpeechError.remoteFailed
                }

                let player = try AVAudioPlayer(data: audioData)
                player.delegate = self
                player.prepareToPlay()
                audioPlayer = player
                notify(.playing)
                guard player.play() else {
                    throw SpeechError.playbackFailed
                }
            } catch {
                guard !Task.isCancelled else { return }
                notify(.playing)
                speakLocally(trimmed, languageCode: languageCode)
            }
        }
    }

    func stop() {
        speechTask?.cancel()
        speechTask = nil
        audioPlayer?.stop()
        audioPlayer = nil
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        notify(.idle)
        stateHandler = nil
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in finishPlayback() }
    }

    nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        Task { @MainActor in finishPlayback() }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in finishPlayback() }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor in finishPlayback() }
    }

    private func finishPlayback() {
        audioPlayer = nil
        notify(.idle)
        stateHandler = nil
    }

    private func notify(_ state: YesNoSpeechPlaybackState) {
        stateHandler?(state)
    }

    private func speakLocally(_ text: String, languageCode: String) {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: speechLocale(for: languageCode))
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.92
        utterance.pitchMultiplier = 1.04
        synthesizer.speak(utterance)
    }

    private func speechLocale(for languageCode: String) -> String {
        switch languageCode.lowercased() {
        case "nl", "nl-nl":
            return "nl-NL"
        case "de", "de-de":
            return "de-DE"
        case "fr", "fr-fr":
            return "fr-FR"
        case "es", "es-es":
            return "es-ES"
        case "it", "it-it":
            return "it-IT"
        case "pt", "pt-pt":
            return "pt-PT"
        case "en", "en-us":
            return "en-US"
        default:
            return languageCode
        }
    }

    private func fetchAtlasAudioURL(text: String, languageCode: String, atlasSpeechURL: URL) async throws -> URL {
        var request = URLRequest(url: atlasSpeechURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(AtlasSpeechRequest(
            app: "yes-no",
            purpose: "speech-playback",
            text: text,
            language: languageCode,
            provider: "narakeet"
        ))

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw SpeechError.remoteFailed
        }

        let decoded = try JSONDecoder().decode(AtlasSpeechResponse.self, from: data)
        let rawAudioURL = decoded.data?.audioUrl ?? decoded.audioUrl
        guard let rawAudioURL, let audioURL = resolveAtlasAudioURL(rawAudioURL) else {
            throw SpeechError.missingAudioURL
        }
        return audioURL
    }

    private func resolveAtlasAudioURL(_ value: String) -> URL? {
        if let absolute = URL(string: value), absolute.scheme != nil {
            return absolute
        }
        if value.hasPrefix("/") {
            return URL(string: "https://api.tikotalks.com\(value)")
        }
        return URL(string: value, relativeTo: URL(string: "https://api.tikotalks.com/v1/atlas/"))?.absoluteURL
    }

    private struct AtlasSpeechRequest: Encodable {
        let app: String
        let purpose: String
        let text: String
        let language: String
        let provider: String
    }

    private struct AtlasSpeechResponse: Decodable {
        let data: SpeechData?
        let audioUrl: String?

        struct SpeechData: Decodable {
            let audioUrl: String?
        }
    }

    private enum SpeechError: Error {
        case remoteFailed
        case missingAudioURL
        case playbackFailed
    }
}
