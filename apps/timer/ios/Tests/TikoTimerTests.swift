import XCTest
@testable import TikoTimer
import TikoKit

/// Requirements-based unit tests for Tiko Timer.
///
/// These exercise the pure countdown engine (`TimerEngine`) that backs the app:
/// the preset catalog, countdown math (remaining time, ring progress, `mm:ss`
/// formatting), the idle → running → paused → running → expired state machine,
/// and persistence/restore. Time is injected via an explicit `now: Date`, so the
/// tests are deterministic and never wait on the wall clock.
///
/// See `REQUIREMENTS.md` for the requirement each test maps to.
final class TikoTimerTests: XCTestCase {

    /// A fixed reference instant so every test is deterministic.
    private let t0 = Date(timeIntervalSince1970: 1_000_000)

    // MARK: - Presets (Req 4)

    /// Req 4: the timer offers exactly the 1 / 3 / 5 / 10 minute presets, in
    /// order, expressed in milliseconds.
    func testPresetCatalogIsOneThreeFiveTenMinutes() {
        XCTAssertEqual(TimerEngine.presetsMs, [60_000, 180_000, 300_000, 600_000])
    }

    /// Selecting a preset starts a running countdown of exactly that duration.
    func testSelectingPresetStartsThatDuration() {
        for ms in TimerEngine.presetsMs {
            var engine = TimerEngine()
            engine.start(durationMs: ms, now: t0)
            XCTAssertEqual(engine.mode, .running)
            XCTAssertEqual(engine.totalDuration, ms)
            XCTAssertEqual(engine.remaining(now: t0), ms, accuracy: 0.001)
        }
    }

    // MARK: - Initial state (Req 1, 5)

    /// Req 5: a fresh engine is idle with nothing running — the no-account,
    /// no-network launch state.
    func testFreshEngineIsIdle() {
        let engine = TimerEngine()
        XCTAssertEqual(engine.mode, .idle)
        XCTAssertEqual(engine.remaining(now: t0), 0)
        XCTAssertEqual(engine.progress(now: t0), 0)
        XCTAssertEqual(engine.displayTime(now: t0), "00:00")
    }

    // MARK: - Countdown math (Req 6, 7)

    /// Req 6: remaining time counts down as wall-clock time advances, and is
    /// clamped to zero (never negative) once the target passes.
    func testRemainingCountsDownAndClampsAtZero() {
        var engine = TimerEngine()
        engine.start(durationMs: 300_000, now: t0) // 5 min

        XCTAssertEqual(engine.remaining(now: t0), 300_000, accuracy: 0.001)
        XCTAssertEqual(engine.remaining(now: t0.addingTimeInterval(60)), 240_000, accuracy: 1) // after 1 min
        XCTAssertEqual(engine.remaining(now: t0.addingTimeInterval(300)), 0, accuracy: 1)      // at expiry
        XCTAssertEqual(engine.remaining(now: t0.addingTimeInterval(999)), 0)                    // past expiry, clamped
    }

    /// Req 7: ring progress runs 0 → 1 across the countdown and is clamped to
    /// `0...1`.
    func testProgressGoesZeroToOne() {
        var engine = TimerEngine()
        engine.start(durationMs: 300_000, now: t0)

        XCTAssertEqual(engine.progress(now: t0), 0, accuracy: 0.0001)
        XCTAssertEqual(engine.progress(now: t0.addingTimeInterval(150)), 0.5, accuracy: 0.001) // halfway
        XCTAssertEqual(engine.progress(now: t0.addingTimeInterval(300)), 1, accuracy: 0.001)   // full
        XCTAssertEqual(engine.progress(now: t0.addingTimeInterval(600)), 1, accuracy: 0.001)   // clamped
    }

    /// Progress is 0 while idle (avoids divide-by-zero on `totalDuration == 0`).
    func testProgressIsZeroWhenIdle() {
        let engine = TimerEngine()
        XCTAssertEqual(engine.progress(now: t0), 0)
    }

    /// Req 8: the display is a zero-padded `mm:ss` string of the remaining time.
    func testDisplayTimeFormatting() {
        var engine = TimerEngine()
        engine.start(durationMs: 600_000, now: t0) // 10:00
        XCTAssertEqual(engine.displayTime(now: t0), "10:00")
        XCTAssertEqual(engine.displayTime(now: t0.addingTimeInterval(1)), "09:59")
        XCTAssertEqual(engine.displayTime(now: t0.addingTimeInterval(305)), "04:55")
        XCTAssertEqual(engine.displayTime(now: t0.addingTimeInterval(600)), "00:00")
    }

    // MARK: - Pause / resume (Req 9, 10)

    /// Req 9: pausing freezes the remaining time; it does not keep counting down
    /// while paused regardless of how much real time passes.
    func testPauseFreezesRemaining() {
        var engine = TimerEngine()
        engine.start(durationMs: 300_000, now: t0)
        engine.pause(now: t0.addingTimeInterval(120)) // pause after 2 min → 3 min left

        XCTAssertEqual(engine.mode, .paused)
        XCTAssertEqual(engine.remaining(now: t0.addingTimeInterval(120)), 180_000, accuracy: 1)
        // 10 minutes of real time pass while paused — remaining is unchanged.
        XCTAssertEqual(engine.remaining(now: t0.addingTimeInterval(720)), 180_000, accuracy: 1)
        XCTAssertEqual(engine.displayTime(now: t0.addingTimeInterval(720)), "03:00")
    }

    /// Req 10: resuming continues from the frozen remaining time, re-anchored to
    /// the moment of resume (the paused interval is not counted).
    func testResumeContinuesFromFrozenRemaining() {
        var engine = TimerEngine()
        engine.start(durationMs: 300_000, now: t0)
        engine.pause(now: t0.addingTimeInterval(120))   // 180s left
        engine.resume(now: t0.addingTimeInterval(500))  // resume much later

        XCTAssertEqual(engine.mode, .running)
        // Right after resume, still ~180s left despite the long pause.
        XCTAssertEqual(engine.remaining(now: t0.addingTimeInterval(500)), 180_000, accuracy: 1)
        // One more minute of running → 120s left.
        XCTAssertEqual(engine.remaining(now: t0.addingTimeInterval(560)), 120_000, accuracy: 1)
    }

    /// Pause/resume are guarded no-ops when not in the required state.
    func testPauseResumeGuards() {
        var engine = TimerEngine()
        engine.pause(now: t0)   // idle → nothing happens
        XCTAssertEqual(engine.mode, .idle)
        engine.resume(now: t0)  // idle → nothing happens
        XCTAssertEqual(engine.mode, .idle)

        engine.start(durationMs: 60_000, now: t0)
        engine.resume(now: t0)  // running → resume is a no-op
        XCTAssertEqual(engine.mode, .running)
    }

    // MARK: - Expiry (Req 11)

    /// Req 11: a running countdown transitions to `.expired` exactly once when it
    /// reaches zero; progress pins to 1 and the display shows `00:00`.
    func testExpiresWhenCountdownReachesZero() {
        var engine = TimerEngine()
        engine.start(durationMs: 60_000, now: t0)

        XCTAssertFalse(engine.expireIfElapsed(now: t0.addingTimeInterval(30)), "should not expire mid-run")
        XCTAssertEqual(engine.mode, .running)

        XCTAssertTrue(engine.expireIfElapsed(now: t0.addingTimeInterval(60)), "should expire at zero")
        XCTAssertEqual(engine.mode, .expired)
        XCTAssertFalse(engine.expireIfElapsed(now: t0.addingTimeInterval(90)), "should only expire once")

        XCTAssertEqual(engine.progress(now: t0.addingTimeInterval(90)), 1)
        XCTAssertEqual(engine.displayTime(now: t0.addingTimeInterval(90)), "00:00")
    }

    /// Progress reflects the frozen remaining time while paused (it doesn't keep
    /// advancing with wall-clock time).
    func testProgressIsFrozenWhilePaused() {
        var engine = TimerEngine()
        engine.start(durationMs: 300_000, now: t0)
        engine.pause(now: t0.addingTimeInterval(150)) // halfway → 150s left

        XCTAssertEqual(engine.progress(now: t0.addingTimeInterval(150)), 0.5, accuracy: 0.001)
        // Real time passing while paused does not move the ring.
        XCTAssertEqual(engine.progress(now: t0.addingTimeInterval(600)), 0.5, accuracy: 0.001)
    }

    /// `hasReachedZero` is only ever true for a *running* countdown at/after its
    /// target — never while idle, paused or already expired.
    func testHasReachedZeroOnlyWhileRunning() {
        var engine = TimerEngine()
        XCTAssertFalse(engine.hasReachedZero(now: t0), "idle never reaches zero")

        engine.start(durationMs: 60_000, now: t0)
        XCTAssertFalse(engine.hasReachedZero(now: t0.addingTimeInterval(30)), "mid-run is not zero")
        XCTAssertTrue(engine.hasReachedZero(now: t0.addingTimeInterval(60)), "running-and-elapsed is zero")

        engine.pause(now: t0.addingTimeInterval(30)) // pause with time left
        XCTAssertFalse(engine.hasReachedZero(now: t0.addingTimeInterval(999)), "paused never reaches zero")
    }

    /// `expireIfElapsed` is a guarded no-op unless the engine is running-and-elapsed.
    func testExpireIfElapsedGuards() {
        var engine = TimerEngine()
        XCTAssertFalse(engine.expireIfElapsed(now: t0), "idle can't expire")
        XCTAssertEqual(engine.mode, .idle)

        engine.start(durationMs: 60_000, now: t0)
        engine.pause(now: t0.addingTimeInterval(10))
        XCTAssertFalse(engine.expireIfElapsed(now: t0.addingTimeInterval(999)), "paused can't expire")
        XCTAssertEqual(engine.mode, .paused)
    }

    /// Starting again from a running/paused state restarts cleanly at the new
    /// duration (the previous run's remaining time is discarded).
    func testStartRestartsFromActiveState() {
        var engine = TimerEngine()
        engine.start(durationMs: 300_000, now: t0)
        engine.pause(now: t0.addingTimeInterval(60))

        engine.start(durationMs: 120_000, now: t0.addingTimeInterval(100)) // restart, 2 min
        XCTAssertEqual(engine.mode, .running)
        XCTAssertEqual(engine.totalDuration, 120_000)
        XCTAssertEqual(engine.remaining(now: t0.addingTimeInterval(100)), 120_000, accuracy: 0.001)
    }

    // MARK: - Reset (Req 12)

    /// Req 12: reset returns the engine to idle from any active state, clearing
    /// the run.
    func testResetReturnsToIdle() {
        var engine = TimerEngine()
        engine.start(durationMs: 300_000, now: t0)
        engine.reset()
        XCTAssertEqual(engine.mode, .idle)
        XCTAssertEqual(engine.totalDuration, 0)
        XCTAssertEqual(engine.remaining(now: t0), 0)

        // Also resets cleanly from expired.
        engine.start(durationMs: 60_000, now: t0)
        engine.expireIfElapsed(now: t0.addingTimeInterval(60))
        engine.reset()
        XCTAssertEqual(engine.mode, .idle)
    }

    // MARK: - Custom start (Req 13)

    /// Req 13: a custom minutes/seconds start computes the right duration, and a
    /// zero-length custom start is ignored (stays idle).
    func testStartCustomDurationAndZeroGuard() {
        var engine = TimerEngine()
        engine.startCustom(minutes: 2, seconds: 30, now: t0)
        XCTAssertEqual(engine.mode, .running)
        XCTAssertEqual(engine.remaining(now: t0), 150_000, accuracy: 0.001)

        var idle = TimerEngine()
        idle.startCustom(minutes: 0, seconds: 0, now: t0) // nothing to run
        XCTAssertEqual(idle.mode, .idle)
    }

    /// A non-positive preset/duration is ignored by `start`.
    func testStartIgnoresNonPositiveDuration() {
        var engine = TimerEngine()
        engine.start(durationMs: 0, now: t0)
        XCTAssertEqual(engine.mode, .idle)
        engine.start(durationMs: -5_000, now: t0)
        XCTAssertEqual(engine.mode, .idle)
    }

    // MARK: - Persistence / restore (Req 14)

    /// Req 14: a running timer whose target is still in the future restores as
    /// running with the correct remaining time.
    func testRestoreRunningStillInFuture() {
        let targetMs = t0.addingTimeInterval(120).timeIntervalSince1970 * 1000
        let engine = TimerEngine.restored(
            persistedMode: "running", targetMs: targetMs, remainingMs: 0, now: t0
        )
        XCTAssertEqual(engine.mode, .running)
        XCTAssertEqual(engine.remaining(now: t0), 120_000, accuracy: 1)
    }

    /// Req 14: a running timer whose target has already passed restores as expired.
    func testRestoreRunningAlreadyElapsedBecomesExpired() {
        let targetMs = t0.addingTimeInterval(-30).timeIntervalSince1970 * 1000
        let engine = TimerEngine.restored(
            persistedMode: "running", targetMs: targetMs, remainingMs: 0, now: t0
        )
        XCTAssertEqual(engine.mode, .expired)
    }

    /// Req 14: a paused timer restores as paused with its frozen remaining time,
    /// and idle/unknown restores to a fresh idle engine.
    func testRestorePausedAndIdle() {
        let paused = TimerEngine.restored(
            persistedMode: "paused", targetMs: 0, remainingMs: 90_000, now: t0
        )
        XCTAssertEqual(paused.mode, .paused)
        XCTAssertEqual(paused.remaining(now: t0), 90_000, accuracy: 0.001)

        let idle = TimerEngine.restored(
            persistedMode: "idle", targetMs: 0, remainingMs: 0, now: t0
        )
        XCTAssertEqual(idle.mode, .idle)
    }

    /// Req 14: an expired timer restores as expired; an unknown persisted mode
    /// falls back to a fresh idle engine.
    func testRestoreExpiredAndUnknown() {
        let expired = TimerEngine.restored(
            persistedMode: "expired", targetMs: 0, remainingMs: 0, now: t0
        )
        XCTAssertEqual(expired.mode, .expired)
        XCTAssertEqual(expired.remaining(now: t0), 0)

        let unknown = TimerEngine.restored(
            persistedMode: "garbage", targetMs: 999, remainingMs: 999, now: t0
        )
        XCTAssertEqual(unknown.mode, .idle)
    }

    // MARK: - Shared kit sanity

    /// The timer palette is wired up via the shared kit (keeps the original
    /// smoke test).
    func testAppColorsExist() {
        XCTAssertEqual(TikoAppColor.timer.palette.label, "Timer")
    }
}
