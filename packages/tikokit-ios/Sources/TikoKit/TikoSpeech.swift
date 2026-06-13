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

@MainActor
public enum TikoSpeechPlaybackState {
    case idle
    case generating
    case playing
}

@MainActor
public final class TikoAtlasSpeechService: NSObject, AVAudioPlayerDelegate, AVSpeechSynthesizerDelegate {
    private let synthesizer = AVSpeechSynthesizer()
    private let atlasSpeechURL: URL
    private let app: String
    private let purpose: String
    private var audioPlayer: AVAudioPlayer?
    private var speechTask: Task<Void, Never>?
    private var stateHandler: ((TikoSpeechPlaybackState) -> Void)?

    public init(
        app: String,
        purpose: String = "speech-playback",
        atlasSpeechURL: URL = URL(string: "https://api.tikotalks.com/v1/atlas/speech")!
    ) {
        self.app = app
        self.purpose = purpose
        self.atlasSpeechURL = atlasSpeechURL
        super.init()
        synthesizer.delegate = self
    }

    public func speak(
        _ text: String,
        languageCode: String = "en",
        onStateChange: ((TikoSpeechPlaybackState) -> Void)? = nil
    ) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        stop()
        stateHandler = onStateChange
        notify(.generating)

        speechTask = Task { [atlasSpeechURL, app, purpose] in
            do {
                let locale = TikoSpeech.languageCode(for: languageCode)
                let audioURL = try await Self.fetchAtlasAudioURL(
                    text: trimmed,
                    languageCode: locale,
                    app: app,
                    purpose: purpose,
                    atlasSpeechURL: atlasSpeechURL
                )
                let (audioData, response) = try await URLSession.shared.data(from: audioURL)
                guard !Task.isCancelled else { return }
                guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                    throw SpeechError.remoteFailed
                }

                TikoSpeech.configurePlaybackSession()
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

    public func stop() {
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

    nonisolated public func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in finishPlayback() }
    }

    nonisolated public func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        Task { @MainActor in finishPlayback() }
    }

    nonisolated public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in finishPlayback() }
    }

    nonisolated public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor in finishPlayback() }
    }

    private func finishPlayback() {
        audioPlayer = nil
        notify(.idle)
        stateHandler = nil
    }

    private func notify(_ state: TikoSpeechPlaybackState) {
        stateHandler?(state)
    }

    private func speakLocally(_ text: String, languageCode: String) {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        TikoSpeech.configurePlaybackSession()
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: TikoSpeech.languageCode(for: languageCode))
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.92
        utterance.pitchMultiplier = 1.04
        synthesizer.speak(utterance)
    }

    private static func fetchAtlasAudioURL(
        text: String,
        languageCode: String,
        app: String,
        purpose: String,
        atlasSpeechURL: URL
    ) async throws -> URL {
        var request = URLRequest(url: atlasSpeechURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(AtlasSpeechRequest(
            app: app,
            purpose: purpose,
            text: text,
            language: languageCode
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

    private static func resolveAtlasAudioURL(_ value: String) -> URL? {
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
