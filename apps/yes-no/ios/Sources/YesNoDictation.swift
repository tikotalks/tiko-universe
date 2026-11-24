import Foundation
import TikoKit
import TikoSpeechKit

/// Takes a spoken question down as text.
///
/// One attempt at a time: it starts on a tap, hands every version of what it
/// has heard to the caller, and ends by itself once the speaker pauses. No
/// audio is kept; the text lives in the question field and nowhere else.
@MainActor
final class YesNoDictation: ObservableObject {
    enum State: Equatable {
        case idle
        case listening
        /// The microphone or speech recognition is switched off for this app.
        case denied
        /// Recognition exists for the language but could not start just now.
        case unavailable
    }

    @Published private(set) var state: State = .idle
    /// False for a language no recognizer on this device understands (Maltese
    /// and Armenian among them). The microphone is then not offered at all.
    @Published private(set) var canListen = false
    /// How loud the room is, 0…1, for the listening indicator.
    @Published private(set) var level: Float = 0

    /// A question is a sentence, not a speech; a forgotten microphone closes.
    nonisolated static let longestQuestion: TimeInterval = 30
    /// The silence after which the question is taken as finished.
    nonisolated static let pauseThatEndsIt: TimeInterval = 1.8

    private let speech: TikoSpeechServicing
    private let pause: TimeInterval
    private var attempt: Task<Void, Never>?
    private var pauseTimer: Task<Void, Never>?

    init(speech: TikoSpeechServicing? = nil, pause: TimeInterval = YesNoDictation.pauseThatEndsIt) {
        if let speech {
            self.speech = speech
        } else {
            let service = TikoSpeechPracticeService()
            service.taskHint = .dictation
            self.speech = service
        }
        self.pause = pause
        self.speech.onAudioLevel = { [weak self] level in
            guard let self, self.state == .listening else { return }
            // The meter is drawn in a handful of steps; anything finer only
            // redraws the panel forty times a second for nothing.
            let stepped = (level * 8).rounded() / 8
            if stepped != self.level { self.level = stepped }
        }
    }

    /// Works out whether this device can take dictation in the language.
    ///
    /// Asked once per language, when the app starts or the language changes,
    /// and kept in `canListen`. The answer comes from the system's speech
    /// service, and asking it while a view is being drawn stops the question
    /// panel from appearing at all — so no view asks; they read the answer.
    func prepare(languageCode: String) {
        if case .unsupportedLocale = speech.recognitionAvailability(languageCode: languageCode) {
            canListen = false
        } else {
            canListen = true
        }
    }

    func toggle(languageCode: String, onHeard: @escaping (String) -> Void) {
        if state == .listening {
            stop()
        } else {
            start(languageCode: languageCode, onHeard: onHeard)
        }
    }

    func stop() {
        pauseTimer?.cancel()
        pauseTimer = nil
        attempt?.cancel()
        attempt = nil
        speech.stopListening()
        level = 0
        if state == .listening { state = .idle }
    }

    private func start(languageCode: String, onHeard: @escaping (String) -> Void) {
        stop()
        attempt = Task { [weak self] in
            guard let self else { return }
            let allowed = await self.isAllowed()
            guard !Task.isCancelled else { return }
            guard allowed else {
                self.state = .denied
                return
            }
            guard case .available = self.speech.recognitionAvailability(languageCode: languageCode) else {
                self.state = .unavailable
                return
            }

            self.state = .listening
            var neverListened = false
            let updates = self.speech.listen(
                languageCode: languageCode,
                contextualWords: [],
                timeout: Self.longestQuestion
            )
            for await update in updates {
                if update.didFail { neverListened = true }
                guard !update.transcript.isEmpty else { continue }
                onHeard(update.transcript)
                self.endAfterPause()
            }

            guard !Task.isCancelled else { return }
            self.pauseTimer?.cancel()
            self.pauseTimer = nil
            self.level = 0
            self.state = neverListened ? .unavailable : .idle
        }
    }

    private func isAllowed() async -> Bool {
        switch speech.permissionState() {
        case .granted: return true
        case .denied: return false
        case .notDetermined: return await speech.requestPermissions()
        }
    }

    /// Restarted by every new word; when it runs out the speaker has stopped.
    private func endAfterPause() {
        pauseTimer?.cancel()
        pauseTimer = Task { [weak self, pause] in
            try? await Task.sleep(nanoseconds: UInt64(pause * 1_000_000_000))
            guard let self, !Task.isCancelled else { return }
            self.speech.stopListening()
        }
    }
}
