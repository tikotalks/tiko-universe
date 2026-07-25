import XCTest
import TikoKit
import TikoSpeechKit
@testable import TikoSum

// MARK: - Scripted speech mock

@MainActor
private final class MockSpeech: TikoSpeechServicing {
    var onAudioLevel: ((Float) -> Void)?
    var permission: TikoPermissionState = .granted
    private(set) var spokenTexts: [String] = []
    private(set) var prefetched: [String] = []
    private(set) var listenCount = 0
    /// Scripted transcript updates per listen attempt; exhausted → parked stream.
    var scriptedAttempts: [[TikoTranscriptUpdate]] = []
    private var openContinuations: [AsyncStream<TikoTranscriptUpdate>.Continuation] = []

    func permissionState() -> TikoPermissionState { permission }
    func requestPermissions() async -> Bool { permission == .granted }
    func recognitionAvailability(languageCode: String) -> TikoRecognitionAvailability { .available(onDevice: true) }

    func speak(_ text: String, languageCode: String) async {
        spokenTexts.append(text)
    }

    func prefetch(texts: [String], languageCode: String) async {
        prefetched.append(contentsOf: texts)
    }

    func listen(languageCode: String, contextualWords: [String], timeout: TimeInterval) -> AsyncStream<TikoTranscriptUpdate> {
        listenCount += 1
        if scriptedAttempts.isEmpty {
            return AsyncStream { continuation in
                self.openContinuations.append(continuation)
            }
        }
        let updates = scriptedAttempts.removeFirst()
        return AsyncStream { continuation in
            for update in updates { continuation.yield(update) }
            continuation.finish()
        }
    }

    func stopListening() {
        openContinuations.forEach { $0.finish() }
        openContinuations = []
    }

    func stopAll() { stopListening() }
}

// MARK: - Tests

@MainActor
final class SumPlayViewModelTests: XCTestCase {
    private func path(_ formulas: [Formula]) -> SumPath {
        SumPath(id: "test", title: "Test", emoji: "🧪", formulas: formulas, isCustom: false, isHidden: false, sortOrder: 0)
    }

    private func makeViewModel(
        path: SumPath?,
        speech: MockSpeech,
        mode: SumAnswerMode = .choice,
        maxNumber: Int = 100
    ) -> SumPlayViewModel {
        SumPlayViewModel(
            path: path,
            languageCode: "en",
            speaker: FormulaSpeaker(languageCode: "en"),
            speech: speech,
            maxNumber: maxNumber,
            answerMode: mode,
            timings: .instant
        )
    }

    private func waitFor(
        _ description: String = "condition",
        timeout: TimeInterval = 2,
        condition: @escaping () -> Bool
    ) async {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition() && Date() < deadline {
            try? await Task.sleep(nanoseconds: 10_000_000)
        }
        XCTAssertTrue(condition(), "timed out waiting for \(description)")
    }

    private func correctChoice(_ vm: SumPlayViewModel) -> AnswerChoice? {
        vm.choices.first(where: \.isCorrect)
    }

    private func wrongChoice(_ vm: SumPlayViewModel) -> AnswerChoice? {
        vm.choices.first(where: { !$0.isCorrect })
    }

    // MARK: Free play

    func testFreePlayStartsBuildingAndPrefetchesKeypad() async {
        let speech = MockSpeech()
        let vm = makeViewModel(path: nil, speech: speech, maxNumber: 20)
        vm.begin()
        XCTAssertEqual(vm.state, .building)
        await waitFor("prefetch") { !speech.prefetched.isEmpty }
        XCTAssertTrue(speech.prefetched.contains("twenty"))
        vm.cancel()
    }

    func testKeypadSpeaksComposedOperand() async {
        let speech = MockSpeech()
        let vm = makeViewModel(path: nil, speech: speech, maxNumber: 20)
        vm.begin()
        vm.pressDigit(1)
        vm.pressDigit(2)
        await waitFor("spoken") { speech.spokenTexts.count >= 2 }
        XCTAssertEqual(speech.spokenTexts.prefix(2), ["one", "twelve"])
        vm.cancel()
    }

    func testOperandRespectsMaxNumber() {
        let speech = MockSpeech()
        let vm = makeViewModel(path: nil, speech: speech, maxNumber: 20)
        vm.begin()
        vm.pressDigit(2)
        vm.pressDigit(5)  // 25 > 20 → ignored
        XCTAssertEqual(vm.draft.aText, "2")
        vm.cancel()
    }

    func testEqualsDisabledForInvalidFormula() {
        let speech = MockSpeech()
        let vm = makeViewModel(path: nil, speech: speech)
        vm.begin()
        vm.pressDigit(7)
        vm.pressOperator(.dividedBy)
        vm.pressDigit(2)
        XCTAssertFalse(vm.canSubmit, "7 ÷ 2 is not exact")
        vm.pressDelete()
        vm.pressDigit(7)  // 7 ÷ 7
        XCTAssertTrue(vm.canSubmit)
        vm.cancel()
    }

    func testFreePlayRoundCelebratesAndClears() async {
        let speech = MockSpeech()
        let vm = makeViewModel(path: nil, speech: speech)
        vm.begin()
        vm.pressDigit(3)
        vm.pressOperator(.plus)
        vm.pressDigit(5)
        vm.pressEquals()
        await waitFor("choosing") { vm.state == .choosing }
        XCTAssertEqual(vm.choices.count, 3)
        vm.choose(correctChoice(vm)!)
        XCTAssertEqual(vm.state, .celebrating)
        await waitFor("back to building") { vm.state == .building }
        XCTAssertTrue(vm.draft.isEmpty)
        vm.cancel()
    }

    // MARK: Answer round retry ladder

    func testMissFadesTileThenPulsesCorrect() async {
        let speech = MockSpeech()
        let vm = makeViewModel(path: path([Formula(a: 3, op: .plus, b: 5)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }

        let wrong1 = wrongChoice(vm)!
        vm.choose(wrong1)
        XCTAssertTrue(vm.fadedValues.contains(wrong1.value))
        XCTAssertFalse(vm.pulseCorrect)
        await waitFor("choosing again") { vm.state == .choosing }

        let wrong2 = vm.choices.first { !$0.isCorrect && !vm.fadedValues.contains($0.value) }!
        vm.choose(wrong2)
        XCTAssertTrue(vm.pulseCorrect, "second miss pulses the correct tile")
        await waitFor("choosing third") { vm.state == .choosing }

        vm.choose(correctChoice(vm)!)
        XCTAssertEqual(vm.state, .celebrating)
        await waitFor("completed") { vm.state == .completed }
    }

    func testFormulaRespokenOnRetry() async {
        let speech = MockSpeech()
        let vm = makeViewModel(path: path([Formula(a: 2, op: .plus, b: 2)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        let spokenBefore = speech.spokenTexts.count
        vm.choose(wrongChoice(vm)!)
        await waitFor("respeak") { speech.spokenTexts.count > spokenBefore }
        XCTAssertEqual(speech.spokenTexts.last, "two plus two is")
        vm.cancel()
    }

    // MARK: Paths

    func testPathAdvancesAndCompletes() async {
        let speech = MockSpeech()
        let formulas = [Formula(a: 1, op: .plus, b: 1), Formula(a: 2, op: .plus, b: 2)]
        let vm = makeViewModel(path: path(formulas), speech: speech)
        vm.begin()
        await waitFor("choosing 1") { vm.state == .choosing }
        vm.choose(correctChoice(vm)!)
        await waitFor("choosing 2") { vm.state == .choosing && vm.session.currentIndex == 1 }
        vm.choose(correctChoice(vm)!)
        await waitFor("completed") { vm.state == .completed }
        XCTAssertEqual(vm.session.completedCount, 2)
    }

    func testSkipAdvancesWithoutCelebration() async {
        let speech = MockSpeech()
        let vm = makeViewModel(path: path([Formula(a: 1, op: .plus, b: 1)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        vm.skip()
        await waitFor("completed") { vm.state == .completed }
        XCTAssertEqual(vm.session.skippedCount, 1)
        XCTAssertEqual(vm.session.completedCount, 0)
    }

    func testRestartResetsSession() async {
        let speech = MockSpeech()
        let vm = makeViewModel(path: path([Formula(a: 1, op: .plus, b: 1)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        vm.skip()
        await waitFor("completed") { vm.state == .completed }
        vm.restart()
        await waitFor("choosing after restart") { vm.state == .choosing }
        XCTAssertEqual(vm.session.currentIndex, 0)
        vm.cancel()
    }

    // MARK: Interruption

    func testInterruptionPausesAndResumes() async {
        let speech = MockSpeech()
        let vm = makeViewModel(path: path([Formula(a: 4, op: .plus, b: 4)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        vm.pauseForInterruption()
        XCTAssertTrue(vm.isPausedForInterruption)
        vm.resumeAfterInterruption()
        await waitFor("choosing again") { vm.state == .choosing }
        XCTAssertFalse(vm.isPausedForInterruption)
        vm.cancel()
    }

    // MARK: Voice answering

    func testVoiceAnswerSelectsCorrectTile() async {
        let speech = MockSpeech()
        speech.scriptedAttempts = [[TikoTranscriptUpdate(transcript: "eight", isFinal: false)]]
        let vm = makeViewModel(path: path([Formula(a: 3, op: .plus, b: 5)]), speech: speech, mode: .voice)
        vm.begin()
        await waitFor("completed via voice") { vm.state == .completed }
        XCTAssertEqual(vm.session.completedCount, 1)
    }

    func testVoiceDisabledNeverListens() async {
        let speech = MockSpeech()
        let vm = makeViewModel(path: path([Formula(a: 3, op: .plus, b: 5)]), speech: speech, mode: .choice)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        XCTAssertEqual(speech.listenCount, 0)
        vm.cancel()
    }

    func testVoiceIgnoresWrongWords() async {
        let speech = MockSpeech()
        speech.scriptedAttempts = [[TikoTranscriptUpdate(transcript: "banana", isFinal: true)]]
        let vm = makeViewModel(path: path([Formula(a: 3, op: .plus, b: 5)]), speech: speech, mode: .voice)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(vm.state, .choosing, "wrong word never advances")
        vm.cancel()
    }
}


// MARK: - Type mode

@MainActor
final class SumTypeModeTests: XCTestCase {
    private func makeVM(_ speech: MockSpeech) -> SumPlayViewModel {
        SumPlayViewModel(
            path: SumPath(id: "t", title: "T", emoji: "🧪", formulas: [Formula(a: 3, op: .plus, b: 5)],
                          isCustom: false, isHidden: false, sortOrder: 0),
            languageCode: "en",
            speaker: FormulaSpeaker(languageCode: "en"),
            speech: speech,
            answerMode: .type,
            timings: .instant
        )
    }

    private func waitFor(_ condition: @escaping () -> Bool) async {
        let deadline = Date().addingTimeInterval(2)
        while !condition() && Date() < deadline {
            try? await Task.sleep(nanoseconds: 10_000_000)
        }
        XCTAssertTrue(condition())
    }

    func testTypedCorrectAnswerCelebrates() async {
        let speech = MockSpeech()
        let vm = makeVM(speech)
        vm.begin()
        await waitFor { vm.state == .choosing }
        XCTAssertFalse(vm.showsChoiceTiles, "type mode hides the tiles")
        vm.typeDigit(8)
        XCTAssertTrue(vm.canSubmitTyped)
        vm.submitTyped()
        XCTAssertEqual(vm.state, .celebrating)
        await waitFor { vm.state == .completed }
    }

    func testTypedWrongAnswerRetriesAndFallsBackToTiles() async {
        let speech = MockSpeech()
        let vm = makeVM(speech)
        vm.begin()
        await waitFor { vm.state == .choosing }

        vm.typeDigit(7)
        vm.submitTyped()
        XCTAssertEqual(vm.typedAnswer, "", "miss clears the input")
        await waitFor { vm.state == .choosing }

        vm.typeDigit(9)
        vm.submitTyped()
        await waitFor { vm.state == .choosing }
        XCTAssertTrue(vm.showsChoiceTiles, "third round falls back to guided tiles")
        let visible = vm.choices.filter { !vm.fadedValues.contains($0.value) }
        XCTAssertLessThanOrEqual(visible.count, 2, "fallback narrows to two tiles")
        vm.choose(vm.choices.first(where: \.isCorrect)!)
        await waitFor { vm.state == .completed }
    }

    func testTypeModeNeverListens() async {
        let speech = MockSpeech()
        let vm = makeVM(speech)
        vm.begin()
        await waitFor { vm.state == .choosing }
        XCTAssertEqual(speech.listenCount, 0)
        vm.cancel()
    }
}
