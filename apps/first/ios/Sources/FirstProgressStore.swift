import Foundation
import TikoKit

/// Tick state, kept deliberately separate from content: a parent editing a
/// routine's words must never disturb where the child got to.
///
/// Progress is per routine per account, written the instant a step is resolved
/// (an app that gets backgrounded mid-routine is the normal case, not the edge
/// case). Routines marked `dailyReset` come back fresh on the next calendar
/// day — the clock and calendar are injectable so date boundaries are tested
/// rather than hoped for.
@MainActor
final class FirstProgressStore: ObservableObject {
    @Published private(set) var revision = 0

    private let defaults: UserDefaults
    private let subjectIDProvider: () -> String
    private let now: () -> Date
    private let calendar: Calendar
    private var progress: [String: RoutineProgress] = [:]

    init(
        defaults: UserDefaults = .standard,
        calendar: Calendar = .current,
        now: @escaping () -> Date = Date.init,
        subjectIDProvider: @escaping () -> String = {
            (try? TikoDeviceSessionStore().load()?.subject.id) ?? "anonymous"
        }
    ) {
        self.defaults = defaults
        self.calendar = calendar
        self.now = now
        self.subjectIDProvider = subjectIDProvider
        load()
    }

    // MARK: - Reading

    /// Progress for a routine, already rolled over if a daily-reset routine was
    /// last touched on an earlier day.
    func progress(for routine: Routine) -> RoutineProgress {
        let stored = progress[routine.id] ?? RoutineProgress(routineID: routine.id, lastUpdated: now())
        if shouldDailyReset(routine: routine, progress: stored) {
            return RoutineProgress(routineID: routine.id, lastUpdated: now())
        }
        // A step a parent deleted must not keep a routine "finished".
        let validIDs = Set(routine.steps.map(\.id))
        guard stored.resolvedStepIDs.contains(where: { !validIDs.contains($0) }) else { return stored }
        var pruned = stored
        pruned.resolvedStepIDs.removeAll { !validIDs.contains($0) }
        pruned.skippedStepIDs = pruned.skippedStepIDs.filter { validIDs.contains($0) }
        return pruned
    }

    /// The step the child should be working on, or nil when the routine is done.
    func currentStep(of routine: Routine) -> RoutineStep? {
        let resolved = Set(progress(for: routine).resolvedStepIDs)
        return routine.orderedSteps.first { !resolved.contains($0.id) }
    }

    func isComplete(_ routine: Routine) -> Bool {
        !routine.steps.isEmpty && currentStep(of: routine) == nil
    }

    /// Whether this routine was finished today — what Parent Mode shows at a
    /// glance.
    func wasCompletedToday(_ routine: Routine) -> Bool {
        guard let stored = progress[routine.id], !stored.isEmpty else { return false }
        guard calendar.isDate(stored.lastUpdated, inSameDayAs: now()) else { return false }
        let resolved = Set(stored.resolvedStepIDs)
        return !routine.steps.isEmpty && routine.steps.allSatisfy { resolved.contains($0.id) }
    }

    func resolvedCount(of routine: Routine) -> Int {
        progress(for: routine).resolvedStepIDs.count
    }

    // MARK: - Writing

    /// Crosses a step off. Only the current step can be resolved — completing
    /// out of order is impossible by construction, which is the whole point of
    /// the app.
    @discardableResult
    func resolve(stepID: String, in routine: Routine, as resolution: StepResolution = .done) -> Bool {
        guard currentStep(of: routine)?.id == stepID else { return false }
        if resolution == .skipped && !routine.allowSkip { return false }

        var updated = progress(for: routine)
        updated.resolvedStepIDs.append(stepID)
        if resolution == .skipped {
            updated.skippedStepIDs.insert(stepID)
        }
        updated.lastUpdated = now()
        progress[routine.id] = updated
        persist()
        return true
    }

    /// Un-does the most recent tick only — kids change their minds, but the
    /// order still has to mean something.
    @discardableResult
    func undoLast(in routine: Routine) -> String? {
        var updated = progress(for: routine)
        guard let last = updated.resolvedStepIDs.popLast() else { return nil }
        updated.skippedStepIDs.remove(last)
        updated.lastUpdated = now()
        progress[routine.id] = updated
        persist()
        return last
    }

    func reset(routineID: String) {
        progress.removeValue(forKey: routineID)
        persist()
    }

    func resetAll() {
        progress.removeAll()
        persist()
    }

    // MARK: - Daily reset

    private func shouldDailyReset(routine: Routine, progress stored: RoutineProgress) -> Bool {
        guard routine.dailyReset, !stored.isEmpty else { return false }
        return !calendar.isDate(stored.lastUpdated, inSameDayAs: now())
    }

    // MARK: - Persistence

    private var progressKey: String { "tiko.first.ios.progress.\(subjectIDProvider())" }

    private func load() {
        guard let data = defaults.data(forKey: progressKey),
              let decoded = try? JSONDecoder().decode([String: RoutineProgress].self, from: data) else { return }
        progress = decoded
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(progress), data.count > 2 {
            defaults.set(data, forKey: progressKey)
        } else {
            defaults.removeObject(forKey: progressKey)
        }
        revision += 1
    }
}
