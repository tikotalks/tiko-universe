import XCTest
@testable import TikoFirst

/// Scripted voice so the loop is fully testable without audio.
@MainActor
final class MockFirstVoice: FirstSpeaking {
    var spoken: [String] = []
    var prefetched: [String] = []
    var stopCount = 0

    func speak(_ text: String, languageCode: String) async {
        spoken.append(text)
    }

    func prefetch(texts: [String], languageCode: String) async {
        prefetched.append(contentsOf: texts)
    }

    func stop() {
        stopCount += 1
    }
}

@MainActor
final class RoutineViewModelTests: XCTestCase {
    private var defaults: UserDefaults!
    private var suiteName: String!

    override func setUp() {
        super.setUp()
        suiteName = "first.vm.tests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        super.tearDown()
    }

    private func routine(stepCount: Int = 3, allowSkip: Bool = false) -> Routine {
        Routine(
            id: "test",
            title: "Test",
            emoji: "⭐️",
            imageURL: nil,
            steps: (0..<stepCount).map { index in
                RoutineStep(id: "s\(index)", title: "Step \(index)", emoji: "⭐️", sortOrder: index)
            },
            dailyReset: false,
            allowSkip: allowSkip,
            isPinned: false,
            isCustom: false,
            isHidden: false,
            sortOrder: 0
        )
    }

    private func makeViewModel(
        routine: Routine? = nil,
        voice mockVoice: MockFirstVoice? = nil,
        progressStore: FirstProgressStore? = nil
    ) -> (RoutineViewModel, MockFirstVoice, FirstProgressStore) {
        let voice = mockVoice ?? MockFirstVoice()
        let resolved = routine ?? self.routine()
        let store = progressStore ?? FirstProgressStore(defaults: defaults, subjectIDProvider: { "subject" })
        let viewModel = RoutineViewModel(
            routine: resolved,
            progressStore: store,
            languageCode: "en",
            voice: voice,
            // Near-instant so the advance chain runs inside the test.
            timings: RoutineViewModel.Timings(tickCelebration: 0.01, betweenSteps: 0.01)
        )
        return (viewModel, voice, store)
    }

    private func settle(_ seconds: Double = 0.12) async {
        try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
    }

    // MARK: - Opening

    func testBeginPresentsAndSpeaksTheFirstStep() async {
        let (viewModel, voice, _) = makeViewModel()
        viewModel.begin()
        await settle()

        XCTAssertEqual(viewModel.currentStep?.id, "s0")
        XCTAssertEqual(voice.spoken, ["Step 0"])
        XCTAssertEqual(viewModel.state, .waiting)
    }

    func testBeginPrefetchesTheWholeRoutine() async {
        let (viewModel, voice, _) = makeViewModel()
        viewModel.begin()
        await settle()
        XCTAssertEqual(voice.prefetched, ["Step 0", "Step 1", "Step 2"])
    }

    func testBeginResumesWhereTheChildStopped() async {
        let routine = routine()
        let progress = FirstProgressStore(defaults: defaults, subjectIDProvider: { "subject" })
        XCTAssertTrue(progress.resolve(stepID: "s0", in: routine))

        let (viewModel, voice, _) = makeViewModel(routine: routine, progressStore: progress)
        viewModel.begin()
        await settle()

        XCTAssertEqual(viewModel.currentStep?.id, "s1")
        XCTAssertEqual(voice.spoken, ["Step 1"], "resuming re-speaks the step the child is on")
    }

    func testBeginOnAFinishedRoutineOpensTheCelebration() async {
        let routine = routine(stepCount: 2)
        let progress = FirstProgressStore(defaults: defaults, subjectIDProvider: { "subject" })
        for step in routine.orderedSteps {
            XCTAssertTrue(progress.resolve(stepID: step.id, in: routine))
        }

        let (viewModel, voice, _) = makeViewModel(routine: routine, progressStore: progress)
        viewModel.begin()
        await settle()

        XCTAssertEqual(viewModel.state, .completed)
        XCTAssertNil(viewModel.currentStep)
        XCTAssertTrue(voice.spoken.isEmpty, "a finished routine does not start talking")
    }

    // MARK: - Ticking

    func testCompletingTheCurrentStepAdvancesAndSpeaksTheNext() async {
        let (viewModel, voice, _) = makeViewModel()
        viewModel.begin()
        await settle()

        viewModel.complete(step: viewModel.currentStep!)
        XCTAssertEqual(viewModel.state, .ticking)
        XCTAssertEqual(viewModel.tickTrigger, 1)
        await settle()

        XCTAssertEqual(viewModel.currentStep?.id, "s1")
        XCTAssertEqual(voice.spoken, ["Step 0", "Step 1"])
    }

    func testTappingAFutureStepOnlySpeaksIt() async {
        let (viewModel, voice, _) = makeViewModel()
        viewModel.begin()
        await settle()

        let future = viewModel.orderedSteps[2]
        viewModel.complete(step: future)
        await settle()

        XCTAssertEqual(viewModel.currentStep?.id, "s0", "a future step can be previewed, never completed")
        XCTAssertEqual(viewModel.resolvedCount, 0)
        XCTAssertEqual(voice.spoken, ["Step 0", "Step 2"])
        XCTAssertEqual(viewModel.tickTrigger, 0)
    }

    func testFinishingTheLastStepCompletesAndCelebrates() async {
        let (viewModel, _, _) = makeViewModel(routine: routine(stepCount: 2))
        viewModel.begin()
        await settle()

        viewModel.complete(step: viewModel.currentStep!)
        await settle()
        viewModel.complete(step: viewModel.currentStep!)
        await settle()

        XCTAssertEqual(viewModel.state, .completed)
        XCTAssertEqual(viewModel.finishTrigger, 1)
        XCTAssertNil(viewModel.currentStep)
    }

    // MARK: - Replay, undo, skip

    func testReplaySpeaksTheCurrentStepAgain() async {
        let (viewModel, voice, _) = makeViewModel()
        viewModel.begin()
        await settle()
        viewModel.replay()
        await settle()
        XCTAssertEqual(voice.spoken, ["Step 0", "Step 0"])
    }

    func testUndoGoesBackAndRespeaks() async {
        let (viewModel, voice, _) = makeViewModel()
        viewModel.begin()
        await settle()
        viewModel.complete(step: viewModel.currentStep!)
        await settle()

        viewModel.undo()
        await settle()

        XCTAssertEqual(viewModel.currentStep?.id, "s0")
        XCTAssertEqual(voice.spoken, ["Step 0", "Step 1", "Step 0"])
        XCTAssertFalse(viewModel.canUndo)
    }

    func testSkipIsUnavailableUnlessTheRoutineAllowsIt() async {
        let (viewModel, _, _) = makeViewModel()
        viewModel.begin()
        await settle()

        XCTAssertFalse(viewModel.canSkip)
        viewModel.skipCurrent()
        await settle()
        XCTAssertEqual(viewModel.currentStep?.id, "s0")
    }

    func testSkipAdvancesWhenAllowed() async {
        let (viewModel, _, _) = makeViewModel(routine: routine(allowSkip: true))
        viewModel.begin()
        await settle()

        XCTAssertTrue(viewModel.canSkip)
        viewModel.skipCurrent()
        await settle()

        XCTAssertEqual(viewModel.currentStep?.id, "s1")
        XCTAssertTrue(viewModel.isSkipped(viewModel.orderedSteps[0]))
    }

    func testStartOverResetsAndSpeaksTheFirstStep() async {
        let (viewModel, voice, _) = makeViewModel(routine: routine(stepCount: 2))
        viewModel.begin()
        await settle()
        viewModel.complete(step: viewModel.currentStep!)
        await settle()
        viewModel.complete(step: viewModel.currentStep!)
        await settle()
        XCTAssertEqual(viewModel.state, .completed)

        viewModel.startOver()
        await settle()

        XCTAssertEqual(viewModel.currentStep?.id, "s0")
        XCTAssertEqual(viewModel.resolvedCount, 0)
        XCTAssertEqual(voice.spoken.last, "Step 0")
    }

    // MARK: - Interruption and refresh

    func testInterruptionStopsTalkingAndKeepsProgress() async {
        let (viewModel, voice, _) = makeViewModel()
        viewModel.begin()
        await settle()
        viewModel.complete(step: viewModel.currentStep!)
        await settle()

        viewModel.pauseForInterruption()

        XCTAssertGreaterThan(voice.stopCount, 0)
        XCTAssertEqual(viewModel.resolvedCount, 1, "backgrounding never loses a tick")
        XCTAssertEqual(viewModel.currentStep?.id, "s1")
    }

    func testRefreshKeepsProgressWhenAParentEditsTheRoutine() async {
        let (viewModel, _, _) = makeViewModel()
        viewModel.begin()
        await settle()
        viewModel.complete(step: viewModel.currentStep!)
        await settle()

        var renamed = viewModel.routine
        renamed.title = "Renamed"
        renamed.steps[1].title = "New words"
        viewModel.refresh(with: renamed)

        XCTAssertEqual(viewModel.routine.title, "Renamed")
        XCTAssertEqual(viewModel.currentStep?.id, "s1")
        XCTAssertEqual(viewModel.resolvedCount, 1)
    }

    func testRefreshAfterAllStepsWereRemovedDoesNotCrash() async {
        let (viewModel, _, _) = makeViewModel()
        viewModel.begin()
        await settle()

        var emptied = viewModel.routine
        emptied.steps = []
        viewModel.refresh(with: emptied)

        XCTAssertNil(viewModel.currentStep)
        XCTAssertEqual(viewModel.state, .completed)
    }

    // MARK: - Derived state

    func testPositionAndCountsTrackProgress() async {
        let (viewModel, _, _) = makeViewModel()
        viewModel.begin()
        await settle()

        XCTAssertEqual(viewModel.currentPosition, 1)
        XCTAssertEqual(viewModel.totalCount, 3)

        viewModel.complete(step: viewModel.currentStep!)
        await settle()

        XCTAssertEqual(viewModel.currentPosition, 2)
        XCTAssertEqual(viewModel.resolvedCount, 1)
        XCTAssertTrue(viewModel.isResolved(viewModel.orderedSteps[0]))
        XCTAssertTrue(viewModel.isCurrent(viewModel.orderedSteps[1]))
    }

    func testStepSaysItsOwnSpeakTextWhenItDiffersFromTheTitle() async {
        var routine = routine(stepCount: 1)
        routine.steps[0] = RoutineStep(
            id: "s0",
            title: "Teeth",
            speakText: "Time to brush your teeth",
            emoji: "🪥",
            sortOrder: 0
        )
        let (viewModel, voice, _) = makeViewModel(routine: routine)
        viewModel.begin()
        await settle()
        XCTAssertEqual(voice.spoken, ["Time to brush your teeth"])
    }
}
