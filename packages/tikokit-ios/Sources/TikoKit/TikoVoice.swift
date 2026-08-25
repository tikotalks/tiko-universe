import AVFoundation
import CryptoKit
import Foundation

/// Word/utterance playback through the Tiko Atlas voice service (the same
/// generated voices across the family), with a persistent disk cache keyed by
/// text + locale so previously heard utterances keep working fully offline.
/// Falls back to on-device `AVSpeechSynthesizer` when an utterance has no
/// cached audio and the network is unreachable.
///
/// Apps configure the app name once at startup:
/// `TikoVoiceService.appName = "say"`.
@MainActor
public final class TikoVoiceService: NSObject, AVAudioPlayerDelegate, AVSpeechSynthesizerDelegate {
    public static let shared = TikoVoiceService()

    /// The Tiko app slug sent to Atlas, set once at app startup.
    public static var appName = "tiko"

    private let atlasSpeechURL = URL(string: "https://api.tikotalks.com/v1/atlas/speech")!
    private let synthesizer = AVSpeechSynthesizer()
    private var player: AVAudioPlayer?
    private var playbackContinuation: CheckedContinuation<Void, Never>?
    private let cacheDirectory: URL

    private var stateHandler: ((TikoSpeechPlaybackState) -> Void)?

    public private(set) var isSpeaking = false

    override public init() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        cacheDirectory = base.appending(path: "TikoVoiceCache", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        super.init()
        synthesizer.delegate = self
    }

    // MARK: - Public API

    /// Speaks and returns when playback finishes. Cached audio → Atlas fetch
    /// (cached for next time) → on-device synthesizer fallback.
    ///
    /// Ends on `.unsupportedLanguage` when none of the three could produce
    /// speech — no cached audio, no network, and no system voice for the
    /// language. That is the normal offline state for Maltese and Armenian,
    /// and the UI has to say so rather than go quiet.
    public func speak(
        _ text: String,
        languageCode: String,
        onStateChange: ((TikoSpeechPlaybackState) -> Void)? = nil
    ) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        stop()
        stateHandler = onStateChange
        TikoSpeech.configurePlaybackSession()
        isSpeaking = true
        defer { isSpeaking = false; stateHandler = nil }

        let locale = TikoSpeech.languageCode(for: languageCode)
        var data = cachedAudio(text: trimmed, locale: locale)
        if data == nil {
            notify(.generating)
            data = try? await fetchAndCache(text: trimmed, locale: locale)
        }
        if let data {
            notify(.playing)
            if await play(data: data) {
                notify(.idle)
                return
            }
        }
        notify(.playing)
        if await speakWithSynthesizer(trimmed, locale: locale) {
            notify(.idle)
            return
        }
        notify(.unsupportedLanguage)
    }

    /// Fire-and-forget playback, for call sites that are not `async`. The
    /// returned task is cancellable; `stop()` covers the common case.
    @discardableResult
    public func speakDetached(
        _ text: String,
        languageCode: String,
        onStateChange: ((TikoSpeechPlaybackState) -> Void)? = nil
    ) -> Task<Void, Never> {
        Task { await speak(text, languageCode: languageCode, onStateChange: onStateChange) }
    }

    /// Quietly downloads and caches audio so later sessions work offline.
    public func prefetch(texts: [String], languageCode: String) async {
        let locale = TikoSpeech.languageCode(for: languageCode)
        for text in texts {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty, cachedAudio(text: trimmed, locale: locale) == nil else { continue }
            _ = try? await fetchAndCache(text: trimmed, locale: locale)
        }
    }

    public func stop() {
        player?.stop()
        player = nil
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        resumePlayback()
        isSpeaking = false
        notify(.idle)
    }

    private func notify(_ state: TikoSpeechPlaybackState) {
        stateHandler?(state)
    }

    // MARK: - Cache

    private func cacheURL(text: String, locale: String) -> URL {
        let key = "\(locale)|\(text.lowercased())"
        let digest = SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
        return cacheDirectory.appending(path: "\(digest).audio")
    }

    private func cachedAudio(text: String, locale: String) -> Data? {
        try? Data(contentsOf: cacheURL(text: text, locale: locale))
    }

    /// "speech-playback" is the one purpose the Atlas capability registry
    /// allows for every app. A per-app purpose gets a 403 and silently drops
    /// the app back to the device voice, so it is not a knob worth having.
    static let atlasPurpose = "speech-playback"

    static func makeAtlasSpeechRequest(
        text: String,
        locale: String,
        app: String,
        atlasSpeechURL: URL,
        accessToken: String?
    ) throws -> URLRequest {
        var request = URLRequest(url: atlasSpeechURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let accessToken, !accessToken.isEmpty {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONEncoder().encode(AtlasSpeechRequest(
            app: app, purpose: atlasPurpose, text: text, locale: locale
        ))
        return request
    }

    private func fetchAndCache(text: String, locale: String) async throws -> Data {
        let request = try Self.makeAtlasSpeechRequest(
            text: text,
            locale: locale,
            app: Self.appName,
            atlasSpeechURL: atlasSpeechURL,
            accessToken: try? TikoDeviceSessionStore().load()?.accessToken
        )

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        let decoded = try JSONDecoder().decode(AtlasSpeechResponse.self, from: data)
        guard let raw = decoded.data?.audioUrl ?? decoded.audioUrl,
              let audioURL = resolveAudioURL(raw) else {
            throw URLError(.badURL)
        }
        let (audioData, audioResponse) = try await URLSession.shared.data(from: audioURL)
        guard let audioHTTP = audioResponse as? HTTPURLResponse, (200..<300).contains(audioHTTP.statusCode) else {
            throw URLError(.badServerResponse)
        }
        try? audioData.write(to: cacheURL(text: text, locale: locale), options: .atomic)
        return audioData
    }

    private func resolveAudioURL(_ value: String) -> URL? {
        if let absolute = URL(string: value), absolute.scheme != nil { return absolute }
        if value.hasPrefix("/") { return URL(string: "https://api.tikotalks.com\(value)") }
        return URL(string: value, relativeTo: URL(string: "https://api.tikotalks.com/v1/atlas/"))?.absoluteURL
    }

    // MARK: - Playback

    private func play(data: Data) async -> Bool {
        guard let player = try? AVAudioPlayer(data: data) else { return false }
        player.delegate = self
        player.prepareToPlay()
        self.player = player
        guard player.play() else {
            self.player = nil
            return false
        }
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            playbackContinuation = continuation
        }
        return true
    }

    /// Returns `false` when this device has no voice for the language, which
    /// is the truth for Maltese and Armenian on every iOS release to date.
    /// Speaking anyway would read the text in whatever voice the synthesizer
    /// defaults to, so the caller has to surface it instead.
    @discardableResult
    private func speakWithSynthesizer(_ text: String, locale: String) async -> Bool {
        guard let voice = TikoSpeech.systemVoice(for: locale) else { return false }
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            playbackContinuation = continuation
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = voice
            utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.88
            utterance.pitchMultiplier = 1.04
            synthesizer.speak(utterance)
        }
        return true
    }

    private func resumePlayback() {
        playbackContinuation?.resume()
        playbackContinuation = nil
        player = nil
    }

    // MARK: - Delegates

    public nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in self.resumePlayback() }
    }

    public nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        Task { @MainActor in self.resumePlayback() }
    }

    public nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in self.resumePlayback() }
    }

    public nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor in self.resumePlayback() }
    }

    // MARK: - Wire types

    private struct AtlasSpeechRequest: Encodable {
        let app: String
        let purpose: String
        let text: String
        let locale: String
    }

    private struct AtlasSpeechResponse: Decodable {
        let data: SpeechData?
        let audioUrl: String?

        struct SpeechData: Decodable {
            let audioUrl: String?
        }
    }
}
