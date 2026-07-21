import Foundation

/// Pure, deterministic countdown engine for Tiko Timer.
///
/// All of the app's timer *logic* lives here — the state machine
/// (idle → running → paused → running → expired), the countdown math and the
/// preset catalog. Every time-dependent method takes an explicit `now: Date`
/// so the behaviour is fully unit-testable without waiting on the wall clock.
///
/// `TimerView` owns a single `TimerEngine` in `@State` and drives it with the
/// real `Date()`; the view itself only renders the engine's state.
///
/// See `REQUIREMENTS.md` for the requirement each behaviour maps to.
struct TimerEngine: Equatable {

    /// The four states a countdown can be in.
    enum Mode: String, Equatable {
        case idle, running, paused, expired
    }

    /// Preset durations offered on the idle screen, in milliseconds:
    /// 1, 3, 5 and 10 minutes. (Localized labels live in the view; these
    /// values are the behavioural contract.)
    static let presetsMs: [Double] = [60_000, 180_000, 300_000, 600_000]

    /// Current state of the countdown.
    private(set) var mode: Mode = .idle

    /// Total duration of the current run, in milliseconds (0 while idle).
    private(set) var totalDuration: Double = 0

    /// Absolute wall-clock instant the countdown ends (meaningful while running).
    private(set) var targetDate: Date = Date(timeIntervalSince1970: 0)

    /// Remaining milliseconds, frozen at the moment of pausing (meaningful while paused).
    private(set) var remainingMs: Double = 0

    init() {}

    // MARK: - Derived values (read-only)

    /// Remaining milliseconds at instant `now`, never negative.
    func remaining(now: Date) -> Double {
        switch mode {
        case .idle, .expired:
            return 0
        case .running:
            return max(0, targetDate.timeIntervalSince(now) * 1000)
        case .paused:
            return remainingMs
        }
    }

    /// Ring fill fraction in `0...1`: 0 at the start of a run, 1 at/after expiry.
    func progress(now: Date) -> Double {
        guard totalDuration > 0 else { return 0 }
        if mode == .expired { return 1 }
        return min(1, max(0, 1 - remaining(now: now) / totalDuration))
    }

    /// `mm:ss` string for the remaining time (e.g. `"04:05"`).
    func displayTime(now: Date) -> String {
        let totalSeconds = Int(max(0, remaining(now: now) / 1000))
        return String(format: "%02d:%02d", totalSeconds / 60, totalSeconds % 60)
    }

    /// True when a *running* countdown has reached zero and should expire.
    func hasReachedZero(now: Date) -> Bool {
        mode == .running && remaining(now: now) <= 0
    }

    // MARK: - Transitions

    /// Start (or restart) a countdown of `durationMs` milliseconds. A non-positive
    /// duration is ignored so the engine never enters a degenerate running state.
    mutating func start(durationMs: Double, now: Date) {
        guard durationMs > 0 else { return }
        totalDuration = durationMs
        targetDate = now.addingTimeInterval(durationMs / 1000)
        remainingMs = 0
        mode = .running
    }

    /// Start a custom countdown from a minutes/seconds pair (the "Custom" start).
    mutating func startCustom(minutes: Int, seconds: Int, now: Date) {
        start(durationMs: (Double(minutes) * 60 + Double(seconds)) * 1000, now: now)
    }

    /// Freeze the countdown, remembering the exact remaining time. No-op unless running.
    mutating func pause(now: Date) {
        guard mode == .running else { return }
        remainingMs = max(0, targetDate.timeIntervalSince(now) * 1000)
        mode = .paused
    }

    /// Resume a paused countdown, re-anchoring the end time to `now`. No-op unless paused.
    mutating func resume(now: Date) {
        guard mode == .paused else { return }
        targetDate = now.addingTimeInterval(remainingMs / 1000)
        mode = .running
    }

    /// Return to the idle screen, clearing the current run.
    mutating func reset() {
        mode = .idle
        totalDuration = 0
        remainingMs = 0
    }

    /// Transition a running-and-elapsed countdown to `.expired`.
    /// - Returns: `true` if it transitioned this call, `false` otherwise.
    @discardableResult
    mutating func expireIfElapsed(now: Date) -> Bool {
        guard hasReachedZero(now: now) else { return false }
        mode = .expired
        return true
    }

    // MARK: - Persistence

    /// Rebuild an engine from the values persisted by `TimerView`
    /// (`timer.mode` / `timer.targetMs` / `timer.remainingMs`). A running timer
    /// whose target is already in the past resolves to `.expired`.
    static func restored(persistedMode: String,
                         targetMs: Double,
                         remainingMs: Double,
                         now: Date) -> TimerEngine {
        var engine = TimerEngine()
        switch persistedMode {
        case Mode.running.rawValue:
            let target = Date(timeIntervalSince1970: targetMs / 1000)
            let left = target.timeIntervalSince(now) * 1000
            if left > 0 {
                engine.mode = .running
                engine.targetDate = target
                // Total duration is not persisted; approximate from what is left.
                engine.totalDuration = left
            } else {
                engine.mode = .expired
            }
        case Mode.paused.rawValue:
            engine.mode = .paused
            engine.remainingMs = remainingMs
        case Mode.expired.rawValue:
            engine.mode = .expired
        default:
            break // idle / unknown → fresh engine
        }
        return engine
    }
}
