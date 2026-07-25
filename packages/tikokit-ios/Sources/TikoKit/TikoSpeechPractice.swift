import AVFoundation
import Foundation
import Speech

public enum TikoPermissionState: Equatable, Sendable {
    case notDetermined
    case denied
    case granted
}

public enum TikoRecognitionAvailability: Equatable, Sendable {
    case available(onDevice: Bool)
    /// The device has no recognizer for this language at all.
    case unsupportedLocale(suggestedLanguageCode: String?)
    /// Recognizer exists but is temporarily unavailable (e.g. network).
    case unavailable
}

public struct TikoTranscriptUpdate: Equatable, Sendable {
    public let transcript: String
    public let isFinal: Bool
    /// True when the attempt never really listened (audio engine or recognizer
    /// failed to start). Lets callers distinguish a broken microphone from a
    /// child who stayed quiet.
    public var didFail: Bool

    public init(transcript: String, isFinal: Bool, didFail: Bool = false) {
        self.transcript = transcript
        self.isFinal = isFinal
        self.didFail = didFail
    }
}

/// Abstraction over the Apple speech stack so practice view models are fully
/// unit-testable with scripted mocks.
@MainActor
public protocol TikoSpeechServicing: AnyObject {
    var onAudioLevel: ((Float) -> Void)? { get set }
    func permissionState() -> TikoPermissionState
    func requestPermissions() async -> Bool
    func recognitionAvailability(languageCode: String) -> TikoRecognitionAvailability
    /// Speaks and returns when playback has finished. Never overlaps listening.
    func speak(_ text: String, languageCode: String) async
    /// Warms the offline voice cache for upcoming utterances.
    func prefetch(texts: [String], languageCode: String) async
    /// Starts one recognition attempt. The stream yields partial transcripts
    /// and ends with a final update (possibly empty on silence/timeout).
    func listen(languageCode: String, contextualWords: [String], timeout: TimeInterval) -> AsyncStream<TikoTranscriptUpdate>
    func stopListening()
    func stopAll()
}

/// Owns every Apple audio and speech object. Only one recognition task is
/// ever active; every attempt starts from a clean slate. No audio is stored,
/// transcripts live only for the current attempt. Playback goes through
/// `TikoVoiceService` (Atlas voices, cached offline).
@MainActor
public final class TikoSpeechPracticeService: NSObject, TikoSpeechServicing {
    public var onAudioLevel: ((Float) -> Void)?

    private let voice = TikoVoiceService.shared
    private let audioEngine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var timeoutTask: Task<Void, Never>?
    private var streamContinuation: AsyncStream<TikoTranscriptUpdate>.Continuation?
    private var latestTranscript = ""

    override public init() {
        super.init()
    }

    // MARK: - Permissions

    public func permissionState() -> TikoPermissionState {
        let speech = SFSpeechRecognizer.authorizationStatus()
        let mic = AVAudioApplication.shared.recordPermission
        if speech == .authorized && mic == .granted { return .granted }
        if speech == .denied || speech == .restricted || mic == .denied { return .denied }
        return .notDetermined
    }

    public func requestPermissions() async -> Bool {
        let speechGranted = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
        guard speechGranted else { return false }
        let micGranted = await AVAudioApplication.requestRecordPermission()
        return micGranted
    }

    // MARK: - Availability

    public func recognitionAvailability(languageCode: String) -> TikoRecognitionAvailability {
        let localeIdentifier = TikoSpeech.languageCode(for: languageCode)
        let locale = Locale(identifier: localeIdentifier)
        guard let recognizer = SFSpeechRecognizer(locale: locale) else {
            return .unsupportedLocale(suggestedLanguageCode: Self.suggestedLanguage(for: languageCode))
        }
        guard recognizer.isAvailable else { return .unavailable }
        return .available(onDevice: recognizer.supportsOnDeviceRecognition)
    }

    /// Nearest supported language: same language family first, English otherwise.
    public static func suggestedLanguage(for languageCode: String) -> String? {
        let requested = TikoLanguageCode.normalized(languageCode)
        let supported = SFSpeechRecognizer.supportedLocales()
        if supported.contains(where: { $0.language.languageCode?.identifier == requested }) {
            return requested
        }
        if supported.contains(where: { $0.language.languageCode?.identifier == "en" }) {
            return "en"
        }
        return supported.first?.language.languageCode?.identifier
    }

    // MARK: - Speaking

    public func speak(_ text: String, languageCode: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        // The app must never recognise its own playback.
        stopListening()
        configureAudioSession()
        await voice.speak(trimmed, languageCode: languageCode)
    }

    public func prefetch(texts: [String], languageCode: String) async {
        await voice.prefetch(texts: texts, languageCode: languageCode)
    }

    // MARK: - Listening

    public func listen(languageCode: String, contextualWords: [String], timeout: TimeInterval) -> AsyncStream<TikoTranscriptUpdate> {
        // Clean slate before every attempt, in the documented order.
        stopListening()
        latestTranscript = ""

        let localeIdentifier = TikoSpeech.languageCode(for: languageCode)
        guard !voice.isSpeaking,
              let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier)),
              recognizer.isAvailable
        else {
            return Self.failedAttemptStream()
        }
        self.recognizer = recognizer

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.taskHint = .confirmation
        request.contextualStrings = contextualWords
        if recognizer.supportsOnDeviceRecognition {
            request.requiresOnDeviceRecognition = true
        }
        recognitionRequest = request

        configureAudioSession()

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        // Simulators and broken audio routes report a 0 Hz / 0-channel input
        // format; installing a tap with it raises an Objective-C exception
        // (IsFormatSampleRateAndChannelCountValid) that would crash the app.
        guard format.sampleRate > 0, format.channelCount > 0 else {
            recognitionRequest = nil
            return Self.failedAttemptStream()
        }
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            request.append(buffer)
            let level = Self.rmsLevel(buffer: buffer)
            Task { @MainActor [weak self] in
                self?.onAudioLevel?(level)
            }
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            inputNode.removeTap(onBus: 0)
            recognitionRequest = nil
            return Self.failedAttemptStream()
        }

        return AsyncStream { continuation in
            streamContinuation = continuation

            recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
                Task { @MainActor [weak self] in
                    guard let self, self.streamContinuation != nil else { return }
                    if let result {
                        self.latestTranscript = result.bestTranscription.formattedString
                        if result.isFinal {
                            self.finishListening(final: self.latestTranscript)
                        } else {
                            self.streamContinuation?.yield(
                                TikoTranscriptUpdate(transcript: self.latestTranscript, isFinal: false)
                            )
                        }
                    }
                    if error != nil {
                        // Silence, cancellation or a recognizer hiccup: end the
                        // attempt calmly with whatever was heard so far.
                        self.finishListening(final: self.latestTranscript)
                    }
                }
            }

            timeoutTask = Task { @MainActor [weak self] in
                try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                guard let self, !Task.isCancelled else { return }
                self.finishListening(final: self.latestTranscript)
            }

            continuation.onTermination = { _ in
                Task { @MainActor [weak self] in
                    self?.teardownRecognition()
                }
            }
        }
    }

    public func stopListening() {
        let continuation = streamContinuation
        streamContinuation = nil
        teardownRecognition()
        continuation?.finish()
    }

    public func stopAll() {
        stopListening()
        voice.stop()
        latestTranscript = ""
    }

    // MARK: - Internals

    /// A stream for attempts that never started listening.
    private static func failedAttemptStream() -> AsyncStream<TikoTranscriptUpdate> {
        AsyncStream { continuation in
            continuation.yield(TikoTranscriptUpdate(transcript: "", isFinal: true, didFail: true))
            continuation.finish()
        }
    }

    private func finishListening(final transcript: String) {
        guard let continuation = streamContinuation else { return }
        streamContinuation = nil
        continuation.yield(TikoTranscriptUpdate(transcript: transcript, isFinal: true))
        continuation.finish()
        teardownRecognition()
    }

    private func teardownRecognition() {
        timeoutTask?.cancel()
        timeoutTask = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        audioEngine.inputNode.removeTap(onBus: 0)
        audioEngine.reset()
        onAudioLevel?(0)
    }

    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .spokenAudio,
                options: [.duckOthers, .defaultToSpeaker, .allowBluetoothHFP]
            )
            try session.setActive(true)
        } catch {
            // Speech should still attempt playback/recognition if the system
            // refuses session changes; failures surface as recognition errors.
        }
    }

    private static func rmsLevel(buffer: AVAudioPCMBuffer) -> Float {
        guard let channelData = buffer.floatChannelData?[0] else { return 0 }
        let frameLength = Int(buffer.frameLength)
        guard frameLength > 0 else { return 0 }
        var sum: Float = 0
        for i in 0..<frameLength {
            let sample = channelData[i]
            sum += sample * sample
        }
        let rms = sqrt(sum / Float(frameLength))
        // Perceptual-ish 0…1 scaling for calm listening indicators.
        return min(1, rms * 12)
    }
}
