import Foundation
import SwiftUI
import TikoKit

/// Free-play formula input state.
struct FormulaDraft: Equatable {
    var aText = ""
    var op: SumOperator?
    var bText = ""

    var formula: Formula? {
        guard let op, let a = Int(aText), let b = Int(bText) else { return nil }
        return Formula(a: a, op: op, b: b)
    }

    var isEmpty: Bool { aText.isEmpty && op == nil && bText.isEmpty }
}

/// Drives both play modes through the documented state machine:
/// building/presenting → speakingFormula → choosing → celebrating | retrying.
/// The answer is always a choice: a miss fades the picked tile, a second miss
/// pulses the correct one — the loop always ends in success.
@MainActor
final class SumPlayViewModel: ObservableObject {
    struct Timings {
        var presentDelay: TimeInterval = 0.3
        var postSpeechDelay: TimeInterval = 0.25
        var celebrationDuration: TimeInterval = 1.6
        var nextItemDelay: TimeInterval = 0.2
        var listenTimeout: TimeInterval = 4.0

        static let standard = Timings()
        static let instant = Timings(
            presentDelay: 0, postSpeechDelay: 0, celebrationDuration: 0,
            nextItemDelay: 0, listenTimeout: 0.2
        )
    }

    @Published private(set) var state: SumPlayState = .idle
    @Published private(set) var session: SumSession
    @Published private(set) var draft = FormulaDraft()
    @Published private(set) var activeFormula: Formula?
    @Published private(set) var choices: [AnswerChoice] = []
    @Published private(set) var fadedValues: Set<Int> = []
    @Published private(set) var pulseCorrect = false
    @Published private(set) var attempt = 1
    @Published private(set) var isPausedForInterruption = false
    @Published private(set) var audioLevel: Float = 0

    let languageCode: String
    let timings: Timings
    let maxNumber: Int
    let voiceAnsweringEnabled: Bool

    private let speech: TikoSpeechServicing
    private let speaker: FormulaSpeaker
    private var runTask: Task<Void, Never>?
    private var listenTask: Task<Void, Never>?
    private var listenRounds = 0

    var isFreePlay: Bool { session.path == nil }

    init(
        path: SumPath?,
        languageCode: String,
        speaker: FormulaSpeaker,
        speech: TikoSpeechServicing,
        maxNumber: Int = 100,
        voiceAnsweringEnabled: Bool = false,
        timings: Timings = .standard
    ) {
        self.session = SumSession(path: path)
        self.languageCode = languageCode
        self.speaker = speaker
        self.speech = speech
        self.maxNumber = maxNumber
        self.voiceAnsweringEnabled = voiceAnsweringEnabled
        self.timings = timings
        speech.onAudioLevel = { [weak self] level in
            self?.audioLevel = level
        }
    }

    // MARK: - Lifecycle

    func begin() {
        let texts: [String]
        if let path = session.path {
            texts = speaker.prefetchTexts(for: path.formulas)
        } else {
            texts = speaker.keypadPrefetchTexts(maxNumber: maxNumber)
        }
        let language = languageCode
        Task { [weak self] in
            await self?.speech.prefetch(texts: texts, languageCode: language)
        }

        if session.path != nil {
            startCurrentFormula()
        } else {
            state = .building
        }
    }

    func cancel() {
        runTask?.cancel()
        listenTask?.cancel()
        speech.stopAll()
        state = .idle
    }

    func pauseForInterruption() {
        guard state != .idle, state != .completed else { return }
        runTask?.cancel()
        listenTask?.cancel()
        speech.stopAll()
        isPausedForInterruption = true
    }

    func resumeAfterInterruption() {
        guard isPausedForInterruption else { return }
        isPausedForInterruption = false
        switch state {
        case .building:
            break
        case .completed:
            break
        default:
            if activeFormula != nil {
                respeakAndChoose()
            } else if session.path != nil {
                startCurrentFormula()
            } else {
                state = .building
            }
        }
    }

    // MARK: - Free-play keypad

    func pressDigit(_ digit: Int) {
        guard state == .building else { return }
        let target = draft.op == nil ? draft.aText : draft.bText
        let candidate = target + String(digit)
        guard let value = Int(candidate), value <= maxNumber, candidate.count <= 3 else { return }
        if draft.op == nil { draft.aText = candidate } else { draft.bText = candidate }
        speak(speaker.number(value))
    }

    func pressOperator(_ op: SumOperator) {
        guard state == .building, !draft.aText.isEmpty, draft.bText.isEmpty else { return }
        draft.op = op
        speak(speaker.operatorWord(op))
    }

    func pressDelete() {
        guard state == .building, !draft.isEmpty else { return }
        if !draft.bText.isEmpty {
            draft.bText.removeLast()
        } else if draft.op != nil {
            draft.op = nil
        } else {
            draft.aText.removeLast()
        }
    }

    var canSubmit: Bool {
        state == .building && (draft.formula?.isValid ?? false)
    }

    func pressEquals() {
        guard canSubmit, let formula = draft.formula else { return }
        runAnswerRound(for: formula)
    }

    // MARK: - Paths

    private func startCurrentFormula() {
        guard let formula = session.currentFormula else {
            state = .completed
            speech.stopAll()
            return
        }
        runTask?.cancel()
        runTask = Task { [weak self] in
            guard let self else { return }
            self.state = .presenting
            await self.pause(self.timings.presentDelay)
            guard !Task.isCancelled else { return }
            self.runAnswerRound(for: formula)
        }
    }

    /// Skip is always available in paths and never blocked.
    func skip() {
        guard session.path != nil else { return }
        runTask?.cancel()
        listenTask?.cancel()
        speech.stopListening()
        session.skippedCount += 1
        advance()
    }

    func restart() {
        runTask?.cancel()
        listenTask?.cancel()
        speech.stopAll()
        session = SumSession(path: session.path)
        attempt = 1
        begin()
    }

    // MARK: - Answer round (shared)

    private func runAnswerRound(for formula: Formula) {
        activeFormula = formula
        attempt = 1
        fadedValues = []
        pulseCorrect = false
        choices = DistractorGenerator.choices(for: formula, maxNumber: 100)

        runTask?.cancel()
        runTask = Task { [weak self] in
            guard let self else { return }
            self.state = .speakingFormula
            await self.speech.speak(self.speaker.formulaUtterance(formula), languageCode: self.languageCode)
            guard !Task.isCancelled else { return }
            await self.pause(self.timings.postSpeechDelay)
            guard !Task.isCancelled else { return }
            self.enterChoosing()
        }
    }

    /// Replay is always available: says the formula again.
    func replay() {
        guard activeFormula != nil else { return }
        respeakAndChoose()
    }

    private func respeakAndChoose() {
        guard let formula = activeFormula else { return }
        listenTask?.cancel()
        speech.stopListening()
        runTask?.cancel()
        runTask = Task { [weak self] in
            guard let self else { return }
            self.state = .speakingFormula
            await self.speech.speak(self.speaker.formulaUtterance(formula), languageCode: self.languageCode)
            guard !Task.isCancelled else { return }
            self.enterChoosing()
        }
    }

    private func enterChoosing() {
        state = .choosing
        listenRounds = 0
        startListeningIfEnabled()
    }

    func choose(_ choice: AnswerChoice) {
        guard state == .choosing else { return }
        listenTask?.cancel()
        speech.stopListening()

        if choice.isCorrect {
            state = .celebrating
            session.completedCount += 1
            runTask?.cancel()
            runTask = Task { [weak self] in
                guard let self else { return }
                await self.pause(self.timings.celebrationDuration)
                guard !Task.isCancelled else { return }
                if self.isFreePlay {
                    self.draft = FormulaDraft()
                    self.activeFormula = nil
                    self.choices = []
                    self.state = .building
                } else {
                    self.advance()
                }
            }
        } else {
            // Calm retry: fade the picked tile; second miss guides with a pulse.
            attempt += 1
            fadedValues.insert(choice.value)
            if attempt >= 3 { pulseCorrect = true }
            state = .retrying(attempt: attempt)
            respeakAndChoose()
        }
    }

    private func advance() {
        session.currentIndex += 1
        activeFormula = nil
        choices = []
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
            self.startCurrentFormula()
        }
    }

    // MARK: - Voice answering

    private func startListeningIfEnabled() {
        guard voiceAnsweringEnabled,
              speech.permissionState() == .granted,
              let formula = activeFormula,
              let correct = formula.result,
              listenRounds < 3 else { return }
        listenRounds += 1

        let listenFor = [String(correct), speaker.number(correct)]
        let matcher = TikoWordMatcher(languageCode: languageCode)
        listenTask?.cancel()
        listenTask = Task { [weak self] in
            guard let self else { return }
            let stream = self.speech.listen(
                languageCode: self.languageCode,
                contextualWords: listenFor,
                timeout: self.timings.listenTimeout
            )
            for await update in stream {
                guard !Task.isCancelled, self.state == .choosing else { return }
                if matcher.match(transcript: update.transcript, listenFor: listenFor) != nil {
                    self.speech.stopListening()
                    if let choice = self.choices.first(where: { $0.isCorrect }) {
                        self.choose(choice)
                    }
                    return
                }
                if update.isFinal, update.didFail { return }
            }
            guard !Task.isCancelled, self.state == .choosing else { return }
            // Quiet re-listen while the child is still choosing.
            self.startListeningIfEnabled()
        }
    }

    // MARK: - Helpers

    private func speak(_ text: String) {
        let language = languageCode
        Task { [weak self] in
            await self?.speech.speak(text, languageCode: language)
        }
    }

    private func pause(_ interval: TimeInterval) async {
        guard interval > 0 else {
            await Task.yield()
            return
        }
        try? await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
    }
}
