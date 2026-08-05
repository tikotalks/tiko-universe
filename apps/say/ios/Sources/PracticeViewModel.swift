import Foundation
import SwiftUI
import TikoKit

/// Drives one practice session through the documented state machine:
/// presenting → speaking → preparingToListen → listening → processing →
/// celebrating (next item) or retrying (listen again).
@MainActor
final class PracticeViewModel: ObservableObject {
    /// All delays are test values, injected so unit tests run instantly and
    /// device tuning only touches one place.
    struct Timings {
        var presentDelay: TimeInterval = 0.3
        var postSpeechDelay: TimeInterval = 0.25
        var silenceBeforeRetry: TimeInterval = 1.2
        var listenTimeout: TimeInterval = 5.0
        var celebrationDuration: TimeInterval = 1.6
        var nextItemDelay: TimeInterval = 0.2

        static let standard = Timings()
        static let instant = Timings(
            presentDelay: 0, postSpeechDelay: 0, silenceBeforeRetry: 0,
            listenTimeout: 0.2, celebrationDuration: 0, nextItemDelay: 0
        )
    }

    @Published private(set) var state: PracticeState = .idle
    @Published private(set) var session: PracticeSession
    @Published private(set) var attempt = 1
    @Published private(set) var skipProminent = false
    @Published private(set) var isPausedForInterruption = false
    @Published private(set) var audioLevel: Float = 0
    /// Set when the app language has no recognizer and practice falls back to
    /// the nearest supported language. Parent-facing notice, never a blocker.
    @Published private(set) var recognitionFallbackLanguage: String?

    // Debug overlay data (development only, never child-facing).
    @Published private(set) var lastPartialTranscript = ""
    @Published private(set) var lastFinalTranscript = ""
    @Published private(set) var lastMatchType: MatchType?
    @Published private(set) var onDeviceSupported = false
    @Published private(set) var listeningStartedAt: Date?
    @Published var debugAutoSuccessDisabled = false

    let category: SayCategory
    let languageCode: String
    let timings: Timings

    private let speech: SaySpeechServicing
    private var recognitionLanguage: String
    private var runTask: Task<Void, Never>?
    private var consecutiveListenFailures = 0
    private var isRequestingPermissions = false

    var currentCard: SayCard? { session.currentCard }

    init(
        category: SayCategory,
        cards: [SayCard],
        languageCode: String,
        speech: SaySpeechServicing,
        timings: Timings = .standard,
        shuffle: Bool = true
    ) {
        self.category = category
        self.languageCode = languageCode
        self.speech = speech
        self.timings = timings
        self.recognitionLanguage = languageCode
        self.session = PracticeSession(category: category, cards: shuffle ? cards.shuffled() : cards)
        speech.onAudioLevel = { [weak self] level in
            self?.audioLevel = level
        }
    }

    // MARK: - Lifecycle

    /// Entry point. Practice needs the microphone, so an undecided permission
    /// goes straight to the system prompt — there is no interstitial the user
    /// can back out of before being asked (App Store guideline 5.1.1(iv)).
    func begin() {
        guard !session.cards.isEmpty else {
            state = .completed
            return
        }
        switch speech.permissionState() {
        case .granted:
            beginAfterPermission()
        case .denied:
            state = .permissionDenied
        case .notDetermined:
            requestPermissions()
        }
    }

    /// Presents the system microphone and speech-recognition prompts.
    func requestPermissions() {
        guard !isRequestingPermissions else { return }
        isRequestingPermissions = true
        state = .requestingPermission
        Task { @MainActor in
            let granted = await speech.requestPermissions()
            isRequestingPermissions = false
            if granted {
                beginAfterPermission()
            } else {
                state = .permissionDenied
            }
        }
    }

    /// Coming back from Settings with permission granted must start practice
    /// without another tap; anything else leaves the Settings screen up.
    func recheckPermissionsAfterSettings() {
        guard state == .permissionDenied, speech.permissionState() == .granted else { return }
        beginAfterPermission()
    }

    private func beginAfterPermission() {
        switch speech.recognitionAvailability(languageCode: languageCode) {
        case .available(let onDevice):
            onDeviceSupported = onDevice
            recognitionLanguage = languageCode
            recognitionFallbackLanguage = nil
        case .unsupportedLocale(let suggested):
            guard let suggested else {
                state = .recognitionUnavailable
                return
            }
            // Never block the child: fall back to the nearest supported
            // language and surface a parent-facing notice.
            recognitionLanguage = suggested
            recognitionFallbackLanguage = suggested
            if case .available(let onDevice) = speech.recognitionAvailability(languageCode: suggested) {
                onDeviceSupported = onDevice
            }
        case .unavailable:
            state = .recognitionUnavailable
            return
        }
        // Warm the offline voice cache for every word in this session.
        let texts = session.cards.map(\.speakText)
        let language = languageCode
        Task { [weak self] in
            await self?.speech.prefetch(texts: texts, languageCode: language)
        }
        startCurrentItem()
    }

    func cancel() {
        runTask?.cancel()
        runTask = nil
        speech.stopAll()
        state = .idle
    }

    /// Backgrounding or navigating away: stop capture, keep the same item, and
    /// require a tap to resume. Never counts as a failed attempt.
    func pauseForInterruption() {
        guard state != .completed, state != .idle, state != .requestingPermission,
              state != .permissionDenied, state != .recognitionUnavailable else { return }
        runTask?.cancel()
        runTask = nil
        speech.stopAll()
        lastPartialTranscript = ""
        isPausedForInterruption = true
        state = .idle
    }

    func resumeAfterInterruption() {
        guard isPausedForInterruption else { return }
        isPausedForInterruption = false
        startCurrentItem()
    }

    // MARK: - Child controls

    /// Replay is always available: cancel listening, say the word again,
    /// then listen again. Does not count as an attempt.
    func replay() {
        guard let card = currentCard, !isPausedForInterruption else { return }
        runTask?.cancel()
        speech.stopListening()
        runTask = Task { [weak self] in
            guard let self else { return }
            self.state = .speaking
            await self.speech.speak(card.speakText, languageCode: self.languageCode)
            guard !Task.isCancelled else { return }
            self.state = .preparingToListen
            await self.pause(self.timings.postSpeechDelay)
            guard !Task.isCancelled else { return }
            await self.listenLoop(card: card)
        }
    }

    /// Skip is always available and never blocked.
    func skip() {
        guard let card = currentCard else { return }
        runTask?.cancel()
        speech.stopListening()
        session.skippedCardIDs.insert(card.id)
        isPausedForInterruption = false
        advance()
    }

    func restartSession() {
        runTask?.cancel()
        speech.stopAll()
        session = PracticeSession(category: category, cards: session.cards.shuffled())
        attempt = 1
        skipProminent = false
        isPausedForInterruption = false
        begin()
    }

    // MARK: - Item flow

    private func startCurrentItem() {
        guard let card = currentCard else {
            state = .completed
            return
        }
        attempt = session.attemptsByCard[card.id] ?? 1
        skipProminent = attempt >= 5
        lastPartialTranscript = ""
        lastFinalTranscript = ""
        lastMatchType = nil

        runTask?.cancel()
        runTask = Task { [weak self] in
            guard let self else { return }
            self.state = .presenting
            await self.pause(self.timings.presentDelay)
            guard !Task.isCancelled else { return }
            self.state = .speaking
            await self.speech.speak(card.speakText, languageCode: self.languageCode)
            guard !Task.isCancelled else { return }
            self.state = .preparingToListen
            await self.pause(self.timings.postSpeechDelay)
            guard !Task.isCancelled else { return }
            await self.listenLoop(card: card)
        }
    }

    private func listenLoop(card: SayCard) async {
        while !Task.isCancelled {
            state = .listening
            listeningStartedAt = Date()
            // Forgiveness widens with each failed attempt so a struggling child
            // still reaches the celebration: standard early, relaxed long-word
            // net on the fourth try, fully forgiving (per-word + short-word
            // fuzzy) from the fifth. Whole-word containment and article/
            // alternative matching apply on every attempt regardless.
            let config: WordMatcherConfig = attempt >= 5 ? .forgiving : (attempt >= 4 ? .relaxed : .standard)
            let matcher = WordMatcher(languageCode: languageCode, config: config)

            var matched: MatchType?
            var attemptFailedToStart = false
            let stream = speech.listen(
                languageCode: recognitionLanguage,
                contextualWords: card.listenFor,
                timeout: timings.listenTimeout
            )
            for await update in stream {
                guard !Task.isCancelled else {
                    speech.stopListening()
                    return
                }
                if update.isFinal {
                    lastFinalTranscript = update.transcript
                    attemptFailedToStart = update.didFail
                } else {
                    lastPartialTranscript = update.transcript
                }
                if !debugAutoSuccessDisabled,
                   let match = matcher.match(transcript: update.transcript, listenFor: card.listenFor) {
                    matched = match
                    // Accept a strong match as soon as it stabilises.
                    speech.stopListening()
                    break
                }
            }
            guard !Task.isCancelled else { return }

            // A microphone/recognizer that never started is not a failed try
            // by the child: never count an attempt, and after a few broken
            // starts show the calm parent-facing unavailable screen.
            if attemptFailedToStart {
                consecutiveListenFailures += 1
                if consecutiveListenFailures >= 3 {
                    speech.stopAll()
                    state = .recognitionUnavailable
                    return
                }
                await pause(timings.silenceBeforeRetry)
                continue
            }
            consecutiveListenFailures = 0

            state = .processing
            if let matched {
                lastMatchType = matched
                await celebrateAndAdvance(card: card)
                return
            }

            // Calm retry: no negative feedback, ever.
            attempt += 1
            session.attemptsByCard[card.id] = attempt
            skipProminent = attempt >= 5
            state = .retrying(attempt: attempt)

            if attempt == 3 {
                // Third attempt: replay the target automatically.
                state = .speaking
                await speech.speak(card.speakText, languageCode: languageCode)
                guard !Task.isCancelled else { return }
                state = .preparingToListen
                await pause(timings.postSpeechDelay)
            } else {
                await pause(timings.silenceBeforeRetry)
            }
        }
    }

    private func celebrateAndAdvance(card: SayCard) async {
        state = .celebrating
        session.completedCardIDs.insert(card.id)
        await pause(timings.celebrationDuration)
        guard !Task.isCancelled else { return }
        advance()
    }

    private func advance() {
        session.currentIndex += 1
        attempt = 1
        skipProminent = false
        lastPartialTranscript = ""
        if session.isFinished {
            speech.stopAll()
            state = .completed
            return
        }
        runTask?.cancel()
        runTask = Task { [weak self] in
            guard let self else { return }
            await self.pause(self.timings.nextItemDelay)
            guard !Task.isCancelled else { return }
            self.startCurrentItem()
        }
    }

    private func pause(_ interval: TimeInterval) async {
        guard interval > 0 else {
            await Task.yield()
            return
        }
        try? await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
    }

    // MARK: - Debug actions (development builds only)

    #if DEBUG
    func debugRestartItem() {
        speech.stopListening()
        startCurrentItem()
    }

    func debugSimulateCorrect() {
        guard let card = currentCard else { return }
        runTask?.cancel()
        speech.stopListening()
        lastMatchType = .exact
        runTask = Task { [weak self] in
            await self?.celebrateAndAdvance(card: card)
        }
    }

    func debugSimulateIncorrect() {
        guard currentCard != nil else { return }
        runTask?.cancel()
        speech.stopListening()
        attempt += 1
        if let card = currentCard {
            session.attemptsByCard[card.id] = attempt
        }
        skipProminent = attempt >= 5
        state = .retrying(attempt: attempt)
    }

    func debugSimulateRecognizerUnavailable() {
        runTask?.cancel()
        speech.stopAll()
        state = .recognitionUnavailable
    }

    var debugDescription: String {
        """
        Locale: \(TikoSpeech.languageCode(for: recognitionLanguage))
        State: \(state)
        Target: \(currentCard?.listenFor.first ?? "—")
        Listen for: \(currentCard?.listenFor.joined(separator: ", ") ?? "—")
        Partial transcript: \(lastPartialTranscript)
        Final transcript: \(lastFinalTranscript)
        Match type: \(lastMatchType.map(String.init(describing:)) ?? "—")
        Attempt: \(attempt)
        On-device supported: \(onDeviceSupported)
        Recognizer available: \(state != .recognitionUnavailable)
        Listening duration: \(listeningStartedAt.map { String(format: "%.1f s", Date().timeIntervalSince($0)) } ?? "—")
        """
    }
    #endif
}
