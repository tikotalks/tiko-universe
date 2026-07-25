import XCTest
@testable import TikoFirst

@MainActor
final class FirstProgressTests: XCTestCase {
    private var defaults: UserDefaults!
    private var suiteName: String!

    override func setUp() {
        super.setUp()
        suiteName = "first.progress.tests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        super.tearDown()
    }

    // MARK: - Helpers

    private func routine(
        id: String = "test",
        stepCount: Int = 3,
        dailyReset: Bool = false,
        allowSkip: Bool = false
    ) -> Routine {
        Routine(
            id: id,
            title: "Test",
            emoji: "⭐️",
            imageURL: nil,
            steps: (0..<stepCount).map { index in
                RoutineStep(id: "\(id).s\(index)", title: "Step \(index)", emoji: "⭐️", sortOrder: index)
            },
            dailyReset: dailyReset,
            allowSkip: allowSkip,
            isPinned: false,
            isCustom: false,
            isHidden: false,
            sortOrder: 0
        )
    }

    private func store(now: @escaping () -> Date = Date.init) -> FirstProgressStore {
        FirstProgressStore(defaults: defaults, now: now, subjectIDProvider: { "subject" })
    }

    // MARK: - Order enforcement

    func testStepsAreCrossedOffInOrder() {
        let store = store()
        let routine = routine()
        let steps = routine.orderedSteps

        XCTAssertEqual(store.currentStep(of: routine)?.id, steps[0].id)
        XCTAssertTrue(store.resolve(stepID: steps[0].id, in: routine))
        XCTAssertEqual(store.currentStep(of: routine)?.id, steps[1].id)
    }

    func testCompletingOutOfOrderIsRefused() {
        let store = store()
        let routine = routine()
        let steps = routine.orderedSteps

        XCTAssertFalse(store.resolve(stepID: steps[2].id, in: routine), "a future step can never be completed early")
        XCTAssertEqual(store.resolvedCount(of: routine), 0)
        XCTAssertEqual(store.currentStep(of: routine)?.id, steps[0].id)
    }

    func testCompletingTheSameStepTwiceIsRefused() {
        let store = store()
        let routine = routine()
        let first = routine.orderedSteps[0]

        XCTAssertTrue(store.resolve(stepID: first.id, in: routine))
        XCTAssertFalse(store.resolve(stepID: first.id, in: routine))
        XCTAssertEqual(store.resolvedCount(of: routine), 1)
    }

    func testRoutineCompletesAfterTheLastStep() {
        let store = store()
        let routine = routine(stepCount: 2)
        for step in routine.orderedSteps {
            XCTAssertTrue(store.resolve(stepID: step.id, in: routine))
        }
        XCTAssertNil(store.currentStep(of: routine))
        XCTAssertTrue(store.isComplete(routine))
    }

    // MARK: - Skipping

    func testSkipIsRefusedUnlessTheRoutineAllowsIt() {
        let store = store()
        let routine = routine(allowSkip: false)
        XCTAssertFalse(store.resolve(stepID: routine.orderedSteps[0].id, in: routine, as: .skipped))
        XCTAssertEqual(store.resolvedCount(of: routine), 0)
    }

    func testSkippedStepCountsAsResolvedButRendersAsSkipped() {
        let store = store()
        let routine = routine(allowSkip: true)
        let first = routine.orderedSteps[0]

        XCTAssertTrue(store.resolve(stepID: first.id, in: routine, as: .skipped))
        let progress = store.progress(for: routine)
        XCTAssertTrue(progress.isResolved(first.id))
        XCTAssertTrue(progress.isSkipped(first.id))
        XCTAssertEqual(store.currentStep(of: routine)?.id, routine.orderedSteps[1].id)
    }

    func testSkippedStepsStillFinishTheRoutine() {
        let store = store()
        let routine = routine(stepCount: 2, allowSkip: true)
        XCTAssertTrue(store.resolve(stepID: routine.orderedSteps[0].id, in: routine, as: .skipped))
        XCTAssertTrue(store.resolve(stepID: routine.orderedSteps[1].id, in: routine, as: .skipped))
        XCTAssertTrue(store.isComplete(routine))
    }

    // MARK: - Undo

    func testUndoLastRemovesOnlyTheMostRecentTick() {
        let store = store()
        let routine = routine()
        let steps = routine.orderedSteps
        XCTAssertTrue(store.resolve(stepID: steps[0].id, in: routine))
        XCTAssertTrue(store.resolve(stepID: steps[1].id, in: routine))

        XCTAssertEqual(store.undoLast(in: routine), steps[1].id)
        XCTAssertEqual(store.currentStep(of: routine)?.id, steps[1].id)
        XCTAssertTrue(store.progress(for: routine).isResolved(steps[0].id))
    }

    func testUndoOnAFreshRoutineDoesNothing() {
        let store = store()
        XCTAssertNil(store.undoLast(in: routine()))
    }

    func testUndoClearsTheSkippedMark() {
        let store = store()
        let routine = routine(allowSkip: true)
        let first = routine.orderedSteps[0]
        XCTAssertTrue(store.resolve(stepID: first.id, in: routine, as: .skipped))
        XCTAssertEqual(store.undoLast(in: routine), first.id)
        XCTAssertFalse(store.progress(for: routine).isSkipped(first.id))
    }

    func testUndoAfterCompletionReopensTheLastStep() {
        let store = store()
        let routine = routine(stepCount: 2)
        for step in routine.orderedSteps {
            XCTAssertTrue(store.resolve(stepID: step.id, in: routine))
        }
        XCTAssertTrue(store.isComplete(routine))
        XCTAssertEqual(store.undoLast(in: routine), routine.orderedSteps[1].id)
        XCTAssertFalse(store.isComplete(routine))
    }

    // MARK: - Resume

    func testProgressSurvivesAFreshStoreForTheSameAccount() {
        let routine = routine()
        let first = store()
        XCTAssertTrue(first.resolve(stepID: routine.orderedSteps[0].id, in: routine))

        // A force-quit is just a new store over the same defaults.
        let reopened = store()
        XCTAssertEqual(reopened.currentStep(of: routine)?.id, routine.orderedSteps[1].id)
    }

    func testProgressIsScopedPerAccount() {
        let routine = routine()
        let mine = FirstProgressStore(defaults: defaults, subjectIDProvider: { "me" })
        XCTAssertTrue(mine.resolve(stepID: routine.orderedSteps[0].id, in: routine))

        let theirs = FirstProgressStore(defaults: defaults, subjectIDProvider: { "someone-else" })
        XCTAssertEqual(theirs.resolvedCount(of: routine), 0)
    }

    func testProgressSurvivesALanguageSwitch() {
        // Step IDs are language-independent, so the same progress applies.
        let english = routine()
        var dutch = english
        dutch.title = "Ochtend"
        dutch.steps = english.steps.map { step in
            var translated = step
            translated.title = "Stap"
            return translated
        }

        let store = store()
        XCTAssertTrue(store.resolve(stepID: english.orderedSteps[0].id, in: english))
        XCTAssertEqual(store.currentStep(of: dutch)?.id, dutch.orderedSteps[1].id)
    }

    // MARK: - Daily reset

    private func date(_ iso: String) -> Date {
        let formatter = ISO8601DateFormatter()
        formatter.timeZone = TimeZone(identifier: "Europe/Amsterdam")
        return formatter.date(from: iso)!
    }

    func testDailyResetRoutineIsFreshOnTheNextDay() {
        let routine = routine(dailyReset: true)
        var clock = date("2026-07-25T21:30:00+02:00")
        let store = store(now: { clock })

        XCTAssertTrue(store.resolve(stepID: routine.orderedSteps[0].id, in: routine))
        XCTAssertEqual(store.resolvedCount(of: routine), 1)

        clock = date("2026-07-26T07:10:00+02:00")
        XCTAssertEqual(store.resolvedCount(of: routine), 0, "a new day starts the routine over")
        XCTAssertEqual(store.currentStep(of: routine)?.id, routine.orderedSteps[0].id)
    }

    func testDailyResetDoesNotFireLaterTheSameDay() {
        let routine = routine(dailyReset: true)
        var clock = date("2026-07-25T07:10:00+02:00")
        let store = store(now: { clock })
        XCTAssertTrue(store.resolve(stepID: routine.orderedSteps[0].id, in: routine))

        clock = date("2026-07-25T23:59:00+02:00")
        XCTAssertEqual(store.resolvedCount(of: routine), 1)
    }

    func testDailyResetSurvivesADSTBoundary() {
        // The night the clocks go back in Europe: 03:00 CEST → 02:00 CET.
        let routine = routine(dailyReset: true)
        var clock = date("2026-10-24T22:00:00+02:00")
        let store = store(now: { clock })
        XCTAssertTrue(store.resolve(stepID: routine.orderedSteps[0].id, in: routine))

        clock = date("2026-10-25T08:00:00+01:00")
        XCTAssertEqual(store.resolvedCount(of: routine), 0)
    }

    func testNonDailyRoutineKeepsProgressAcrossDays() {
        let routine = routine(dailyReset: false)
        var clock = date("2026-07-25T21:30:00+02:00")
        let store = store(now: { clock })
        XCTAssertTrue(store.resolve(stepID: routine.orderedSteps[0].id, in: routine))

        clock = date("2026-07-27T09:00:00+02:00")
        XCTAssertEqual(store.resolvedCount(of: routine), 1, "only daily-reset routines roll over")
    }

    func testWasCompletedTodayOnlyCountsTodaysFinish() {
        let routine = routine(stepCount: 2)
        var clock = date("2026-07-25T18:00:00+02:00")
        let store = store(now: { clock })
        for step in routine.orderedSteps {
            XCTAssertTrue(store.resolve(stepID: step.id, in: routine))
        }
        XCTAssertTrue(store.wasCompletedToday(routine))

        clock = date("2026-07-26T09:00:00+02:00")
        XCTAssertFalse(store.wasCompletedToday(routine))
    }

    // MARK: - Reset and editing

    func testManualResetClearsProgress() {
        let store = store()
        let routine = routine()
        XCTAssertTrue(store.resolve(stepID: routine.orderedSteps[0].id, in: routine))
        store.reset(routineID: routine.id)
        XCTAssertEqual(store.resolvedCount(of: routine), 0)
    }

    func testDeletedStepsDropOutOfProgress() {
        let store = store()
        let routine = routine(stepCount: 3)
        for step in routine.orderedSteps.prefix(2) {
            XCTAssertTrue(store.resolve(stepID: step.id, in: routine))
        }

        // A parent removes the step the child had just ticked.
        var edited = routine
        edited.steps.removeAll { $0.id == routine.orderedSteps[1].id }

        XCTAssertEqual(store.resolvedCount(of: edited), 1)
        XCTAssertEqual(store.currentStep(of: edited)?.id, routine.orderedSteps[2].id)
        XCTAssertFalse(store.isComplete(edited))
    }

    func testAddedStepReopensAFinishedRoutine() {
        let store = store()
        let routine = routine(stepCount: 2)
        for step in routine.orderedSteps {
            XCTAssertTrue(store.resolve(stepID: step.id, in: routine))
        }
        XCTAssertTrue(store.isComplete(routine))

        var edited = routine
        edited.steps.append(RoutineStep(id: "test.extra", title: "Extra", emoji: "⭐️", sortOrder: 2))
        XCTAssertFalse(store.isComplete(edited))
        XCTAssertEqual(store.currentStep(of: edited)?.id, "test.extra")
    }

    func testEmptyRoutineIsNeverComplete() {
        let store = store()
        let empty = routine(stepCount: 0)
        XCTAssertFalse(store.isComplete(empty))
        XCTAssertNil(store.currentStep(of: empty))
    }
}
