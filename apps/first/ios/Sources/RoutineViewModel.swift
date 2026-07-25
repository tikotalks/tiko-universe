import Foundation
import TikoKit

/// Voice-out only — First has no microphone, no recognizer and no permissions
/// at all, so its speech surface is this small.
@MainActor
protocol FirstSpeaking: AnyObject {
    func speak(_ text: String, languageCode: String) async
    func prefetch(texts: [String], languageCode: String) async
    func stop()
}

/// The Tiko voice service (Atlas voices, disk-cached, synthesizer fallback).
@MainActor
final class FirstVoice: FirstSpeaking {
    private let voice = TikoVoiceService.shared

    func speak(_ text: String, languageCode: String) async {
        await voice.speak(text, languageCode: languageCode)
    }

    func prefetch(texts: [String], languageCode: String) async {
        await voice.prefetch(texts: texts, languageCode: languageCode)
    }

    func stop() {
        voice.stop()
    }
}

/// Drives one routine: which step is current, what gets spoken, when to
/// celebrate. Order enforcement lives in `FirstProgressStore`, so this type
/// cannot advance past a step that was not resolved.
@MainActor
final class RoutineViewModel: ObservableObject {
    struct Timings {
        var tickCelebration: TimeInterval
        var betweenSteps: TimeInterval

        static let standard = Timings(tickCelebration: 0.9, betweenSteps: 0.25)
    }

    @Published private(set) var state: RoutineState = .idle
    @Published private(set) var routine: Routine
    /// Bumped every time a step is ticked, so the view can animate.
    @Published private(set) var tickTrigger = 0
    /// Bumped when the whole routine finishes.
    @Published private(set) var finishTrigger = 0
    /// The step the child is looking at right now.
    @Published private(set) var currentStep: RoutineStep?
    @Published private(set) var isSpeaking = false

    let languageCode: String
    private let progressStore: FirstProgressStore
    private let voice: FirstSpeaking
    private let timings: Timings
    private var speakTask: Task<Void, Never>?
    private var advanceTask: Task<Void, Never>?

    init(
        routine: Routine,
        progressStore: FirstProgressStore,
        languageCode: String,
        voice: FirstSpeaking? = nil,
        timings: Timings = .standard
    ) {
        self.routine = routine
        self.progressStore = progressStore
        self.languageCode = languageCode
        self.voice = voice ?? FirstVoice()
        self.timings = timings
    }

    // MARK: - Derived state

    var orderedSteps: [RoutineStep] { routine.orderedSteps }

    var progress: RoutineProgress { progressStore.progress(for: routine) }

    var resolvedCount: Int { progress.resolvedStepIDs.count }

    var totalCount: Int { routine.steps.count }

    /// 1-based position of the current step, for VoiceOver.
    var currentPosition: Int { min(resolvedCount + 1, max(totalCount, 1)) }

    var canUndo: Bool { !progress.resolvedStepIDs.isEmpty }

    var canSkip: Bool { routine.allowSkip && currentStep != nil }

    func isResolved(_ step: RoutineStep) -> Bool { progress.isResolved(step.id) }

    func isSkipped(_ step: RoutineStep) -> Bool { progress.isSkipped(step.id) }

    func isCurrent(_ step: RoutineStep) -> Bool { currentStep?.id == step.id }

    // MARK: - Lifecycle

    /// Opens the routine where the child left off and speaks that step. An
    /// already-finished routine opens on its celebration screen rather than
    /// pretending there is work left.
    func begin() {
        // Prefetch the whole routine so it keeps working offline.
        let texts = orderedSteps.map(\.spoken)
        let language = languageCode
        Task { [voice] in
            await voice.prefetch(texts: texts, languageCode: language)
        }

        if progressStore.isComplete(routine) {
            currentStep = nil
            state = .completed
            return
        }
        presentCurrent(speak: true)
    }

    func cancel() {
        speakTask?.cancel()
        advanceTask?.cancel()
        voice.stop()
        isSpeaking = false
    }

    /// Backgrounding: stop talking, keep the progress (it is already written).
    func pauseForInterruption() {
        speakTask?.cancel()
        advanceTask?.cancel()
        voice.stop()
        isSpeaking = false
        if state == .presenting {
            state = .waiting
        }
    }

    /// Content changed under us (a parent edited the routine, or the language
    /// switched): re-resolve the current step without losing progress.
    func refresh(with routine: Routine) {
        self.routine = routine
        if progressStore.isComplete(routine) {
            currentStep = nil
            state = .completed
            return
        }
        presentCurrent(speak: false)
    }

    // MARK: - Child actions

    /// Crosses the current step off. Anything else is a preview, never a
    /// completion.
    func complete(step: RoutineStep) {
        guard state == .waiting || state == .presenting else { return }
        guard step.id == currentStep?.id else {
            preview(step: step)
            return
        }
        guard progressStore.resolve(stepID: step.id, in: routine, as: .done) else { return }
        tick()
    }

    /// Only available when a parent allowed it for this routine.
    func skipCurrent() {
        guard let step = currentStep, routine.allowSkip else { return }
        guard progressStore.resolve(stepID: step.id, in: routine, as: .skipped) else { return }
        tick()
    }

    /// Speaks a future step without changing anything — looking ahead is
    /// allowed, jumping ahead is not.
    func preview(step: RoutineStep) {
        speak(step.spoken)
    }

    func replay() {
        guard let step = currentStep else { return }
        speak(step.spoken)
    }

    /// Un-does the most recent tick.
    func undo() {
        guard progressStore.undoLast(in: routine) != nil else { return }
        advanceTask?.cancel()
        presentCurrent(speak: true)
    }

    /// After the finish celebration: start the routine over.
    func startOver() {
        progressStore.reset(routineID: routine.id)
        presentCurrent(speak: true)
    }

    // MARK: - Internals

    private func tick() {
        tickTrigger += 1
        state = .ticking
        advanceTask?.cancel()
        advanceTask = Task { @MainActor [weak self] in
            guard let self else { return }
            try? await Task.sleep(nanoseconds: UInt64(self.timings.tickCelebration * 1_000_000_000))
            guard !Task.isCancelled else { return }
            if self.progressStore.isComplete(self.routine) {
                self.currentStep = nil
                self.state = .completed
                self.finishTrigger += 1
                return
            }
            try? await Task.sleep(nanoseconds: UInt64(self.timings.betweenSteps * 1_000_000_000))
            guard !Task.isCancelled else { return }
            self.presentCurrent(speak: true)
        }
    }

    private func presentCurrent(speak shouldSpeak: Bool) {
        currentStep = progressStore.currentStep(of: routine)
        guard let step = currentStep else {
            state = .completed
            return
        }
        state = .presenting
        if shouldSpeak {
            speak(step.spoken)
        } else {
            state = .waiting
        }
    }

    private func speak(_ text: String) {
        speakTask?.cancel()
        let language = languageCode
        speakTask = Task { @MainActor [weak self] in
            guard let self else { return }
            self.isSpeaking = true
            await self.voice.speak(text, languageCode: language)
            guard !Task.isCancelled else { return }
            self.isSpeaking = false
            if self.state == .presenting {
                self.state = .waiting
            }
        }
    }
}
