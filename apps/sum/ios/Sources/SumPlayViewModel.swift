import Foundation
import SwiftUI
import TikoKit
import TikoSpeechKit

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

/// Drives both play modes through the state machine:
/// building/revealing → choosing → celebrating → next | completed.
/// The formula lands one part at a time — "10", then "+", then "20" — spoken
/// as it lands, while the answer tiles are already on screen and tappable. A
/// wrong pick stays visible, flashes, and quietly switches itself off; the
/// loop always ends in success.
@MainActor
final class SumPlayViewModel: ObservableObject {
    struct Timings {
        /// Beat before the first part of a formula pops in.
        var presentDelay: TimeInterval = 0.2
        /// Beat between two parts of the same formula.
        var partGap: TimeInterval = 0.1
        /// How long a wrong tile flashes before it switches itself off.
        var wrongFlashDuration: TimeInterval = 0.5
        /// Long enough to land as a reward, short enough that ten of them in a
        /// row never feel like waiting. The burst itself runs a touch shorter.
        var celebrationDuration: TimeInterval = 0.8
        var nextItemDelay: TimeInterval = 0.2
        var listenTimeout: TimeInterval = 4.0

        static let standard = Timings()
        static let instant = Timings(
            presentDelay: 0, partGap: 0, wrongFlashDuration: 0,
            celebrationDuration: 0, nextItemDelay: 0, listenTimeout: 0.2
        )
    }

    @Published private(set) var state: SumPlayState = .idle
    @Published private(set) var session: SumSession
    @Published private(set) var draft = FormulaDraft()
    @Published private(set) var activeFormula: Formula?
    @Published private(set) var choices: [AnswerChoice] = []
    /// How much of `activeFormula` has landed: 0 = nothing, 3 = all of it.
    @Published private(set) var revealedParts = 0
    /// Bumped every time a part lands, so the view can pop a sound per part.
    @Published private(set) var revealTrigger = 0
    /// The tile that was just picked wrongly — still on screen, flashing.
    @Published private(set) var wrongValue: Int?
    /// Bumped on every miss, so the view can play the soft acknowledgement.
    @Published private(set) var missTrigger = 0
    /// Tiles that have been used up: dimmed, still readable, not tappable.
    @Published private(set) var disabledValues: Set<Int> = []
    /// The tile that won this round — it dances and gets the fireworks.
    @Published private(set) var wonValue: Int?
    @Published private(set) var pulseCorrect = false
    /// Type mode: the digits entered so far.
    @Published private(set) var typedAnswer = ""
    /// Type mode falls back to two choice tiles after repeated misses so the
    /// loop always ends in success.
    @Published private(set) var typeFallbackActive = false
    @Published private(set) var attempt = 1
    @Published private(set) var isPausedForInterruption = false
    @Published private(set) var audioLevel: Float = 0

    let languageCode: String
    let timings: Timings
    let maxNumber: Int
    let answerMode: SumAnswerMode

    private let speech: TikoSpeechServicing
    private let speaker: FormulaSpeaker
    /// Deals a brand-new game for "play again" — nil when the run is a fixed
    /// path (or free play), where replaying means the very same sums.
    private let regenerate: (() -> SumGame)?
    private var runTask: Task<Void, Never>?
    private var missTask: Task<Void, Never>?
    private var listenTask: Task<Void, Never>?
    private var listenRounds = 0

    var isFreePlay: Bool { session.game == nil }

    init(
        game: SumGame?,
        languageCode: String,
        speaker: FormulaSpeaker,
        speech: TikoSpeechServicing,
        maxNumber: Int = 100,
        answerMode: SumAnswerMode = .choice,
        regenerate: (() -> SumGame)? = nil,
        timings: Timings = .standard
    ) {
        self.session = SumSession(game: game)
        self.languageCode = languageCode
        self.speaker = speaker
        self.speech = speech
        self.maxNumber = maxNumber
        self.answerMode = answerMode
        self.regenerate = regenerate
        self.timings = timings
        speech.onAudioLevel = { [weak self] level in
            self?.audioLevel = level
        }
    }

    // MARK: - Lifecycle

    func begin() {
        let texts: [String]
        if let game = session.game {
            texts = speaker.prefetchTexts(for: game.formulas)
        } else {
            texts = speaker.keypadPrefetchTexts(maxNumber: maxNumber)
        }
        let language = languageCode
        Task { [weak self] in
            await self?.speech.prefetch(texts: texts, languageCode: language)
        }

        if session.game != nil {
            startCurrentFormula()
        } else {
            state = .building
        }
    }

    func cancel() {
        cancelTasks()
        speech.stopAll()
        state = .idle
    }

    func pauseForInterruption() {
        guard state != .idle, state != .completed else { return }
        cancelTasks()
        speech.stopAll()
        isPausedForInterruption = true
    }

    func resumeAfterInterruption() {
        guard isPausedForInterruption else { return }
        isPausedForInterruption = false
        switch state {
        case .building, .completed:
            break
        default:
            if activeFormula != nil {
                respeakAndChoose()
            } else if session.game != nil {
                startCurrentFormula()
            } else {
                state = .building
            }
        }
    }

    private func cancelTasks() {
        runTask?.cancel()
        missTask?.cancel()
        listenTask?.cancel()
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

    // MARK: - Games

    private func startCurrentFormula() {
        guard let formula = session.currentFormula else {
            state = .completed
            speech.stopAll()
            return
        }
        runAnswerRound(for: formula)
    }

    /// Skip is always available in a game and never blocked.
    func skip() {
        guard session.game != nil else { return }
        cancelTasks()
        speech.stopListening()
        session.skippedCount += 1
        advance()
    }

    /// Play again. A preset deals ten fresh sums; a fixed path replays its own.
    func restart() {
        cancelTasks()
        speech.stopAll()
        session = SumSession(game: regenerate?() ?? session.game)
        attempt = 1
        begin()
    }

    // MARK: - Answer round (shared)

    private func runAnswerRound(for formula: Formula) {
        activeFormula = formula
        attempt = 1
        revealedParts = isFreePlay ? 3 : 0
        wrongValue = nil
        wonValue = nil
        disabledValues = []
        pulseCorrect = false
        typedAnswer = ""
        typeFallbackActive = false
        // The tiles are on screen before the formula finishes landing — the
        // child can answer the moment they know, without waiting out the voice.
        choices = DistractorGenerator.choices(for: formula, maxNumber: 100)
        prefetchNextFormula()

        cancelTasks()
        state = .revealing
        runTask = Task { [weak self] in
            guard let self else { return }
            await self.pause(self.timings.presentDelay)
            guard !Task.isCancelled else { return }
            await self.revealParts(of: formula)
            guard !Task.isCancelled else { return }
            self.enterChoosing()
        }
    }

    /// "10" … "+" … "20": each part lands, then is spoken, then the next one.
    private func revealParts(of formula: Formula) async {
        for (index, text) in speaker.partTexts(formula).enumerated() {
            guard !Task.isCancelled else { return }
            if !isFreePlay { revealedParts = index + 1 }
            revealTrigger += 1
            await speech.speak(text, languageCode: languageCode)
            guard !Task.isCancelled else { return }
            await pause(timings.partGap)
        }
    }

    /// The next sum's voice is rendered while the child answers this one, so
    /// it can start speaking the instant the tiles change.
    private func prefetchNextFormula() {
        guard let next = session.nextFormula else { return }
        var texts = speaker.partTexts(next)
        if let result = next.result { texts.append(speaker.number(result)) }
        let language = languageCode
        Task { [weak self] in
            await self?.speech.prefetch(texts: texts, languageCode: language)
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
        state = .revealing
        revealedParts = 3
        runTask = Task { [weak self] in
            guard let self else { return }
            await self.speech.speak(self.speaker.formulaUtterance(formula), languageCode: self.languageCode)
            guard !Task.isCancelled else { return }
            self.enterChoosing()
        }
    }

    private func enterChoosing() {
        revealedParts = 3
        state = .choosing
        listenRounds = 0
        startListeningIfEnabled()
    }

    /// Tiles stay live through the reveal — waiting for the voice to finish is
    /// the slow part the child never needed.
    var isAnswerable: Bool {
        state == .revealing || state == .choosing
    }

    func choose(_ choice: AnswerChoice) {
        guard isAnswerable,
              !disabledValues.contains(choice.value),
              wrongValue != choice.value else { return }
        listenTask?.cancel()
        speech.stopListening()

        if choice.isCorrect {
            wonValue = choice.value
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
                    self.wonValue = nil
                    self.revealedParts = 0
                    self.state = .building
                } else {
                    self.advance()
                }
            }
        } else {
            // The tile stays put and flashes, then switches itself off — never
            // a vanishing act, never a spoken "wrong".
            attempt += 1
            wrongValue = choice.value
            missTrigger += 1
            missTask?.cancel()
            missTask = Task { [weak self] in
                guard let self else { return }
                await self.pause(self.timings.wrongFlashDuration)
                guard !Task.isCancelled else { return }
                self.disabledValues.insert(choice.value)
                self.wrongValue = nil
                if self.remainingChoices.count == 1 { self.pulseCorrect = true }
            }
        }
    }

    /// Tiles still in play.
    var remainingChoices: [AnswerChoice] {
        choices.filter { !disabledValues.contains($0.value) }
    }

    // MARK: - Type mode

    var showsChoiceTiles: Bool {
        answerMode != .type || typeFallbackActive
    }

    func typeDigit(_ digit: Int) {
        guard isAnswerable, answerMode == .type, !typeFallbackActive else { return }
        let candidate = typedAnswer + String(digit)
        guard candidate.count <= 3, Int(candidate) != nil else { return }
        typedAnswer = candidate
    }

    func typeDelete() {
        guard isAnswerable, !typedAnswer.isEmpty else { return }
        typedAnswer.removeLast()
    }

    var canSubmitTyped: Bool {
        isAnswerable && answerMode == .type && !typeFallbackActive && Int(typedAnswer) != nil
    }

    func submitTyped() {
        guard canSubmitTyped, let value = Int(typedAnswer),
              let correct = activeFormula?.result else { return }
        if value == correct {
            choose(AnswerChoice(value: correct, isCorrect: true))
            return
        }
        // Calm miss: soft tone, clear the pad; the third miss falls back to two
        // choice tiles so the child always gets there.
        attempt += 1
        typedAnswer = ""
        missTrigger += 1
        if attempt >= 3 {
            typeFallbackActive = true
            disabledValues = Set(choices.filter { !$0.isCorrect }.dropFirst().map(\.value))
        }
    }

    private func advance() {
        session.currentIndex += 1
        activeFormula = nil
        choices = []
        wonValue = nil
        revealedParts = 0
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
        guard answerMode == .voice,
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
