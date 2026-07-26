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
    private func game(_ formulas: [Formula]) -> SumGame {
        SumGame(id: "test", emoji: "🧪", formulas: formulas)
    }

    private func makeViewModel(
        game: SumGame?,
        speech: MockSpeech,
        mode: SumAnswerMode = .choice,
        maxNumber: Int = 100,
        regenerate: (() -> SumGame)? = nil
    ) -> SumPlayViewModel {
        SumPlayViewModel(
            game: game,
            languageCode: "en",
            speaker: FormulaSpeaker(languageCode: "en"),
            speech: speech,
            maxNumber: maxNumber,
            answerMode: mode,
            regenerate: regenerate,
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
        let vm = makeViewModel(game: nil, speech: speech, maxNumber: 20)
        vm.begin()
        XCTAssertEqual(vm.state, .building)
        await waitFor("prefetch") { !speech.prefetched.isEmpty }
        XCTAssertTrue(speech.prefetched.contains("twenty"))
        vm.cancel()
    }

    func testKeypadSpeaksComposedOperand() async {
        let speech = MockSpeech()
        let vm = makeViewModel(game: nil, speech: speech, maxNumber: 20)
        vm.begin()
        vm.pressDigit(1)
        vm.pressDigit(2)
        await waitFor("spoken") { speech.spokenTexts.count >= 2 }
        XCTAssertEqual(speech.spokenTexts.prefix(2), ["one", "twelve"])
        vm.cancel()
    }

    func testOperandRespectsMaxNumber() {
        let speech = MockSpeech()
        let vm = makeViewModel(game: nil, speech: speech, maxNumber: 20)
        vm.begin()
        vm.pressDigit(2)
        vm.pressDigit(5)  // 25 > 20 → ignored
        XCTAssertEqual(vm.draft.aText, "2")
        vm.cancel()
    }

    func testEqualsDisabledForInvalidFormula() {
        let speech = MockSpeech()
        let vm = makeViewModel(game: nil, speech: speech)
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
        let vm = makeViewModel(game: nil, speech: speech)
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

    // MARK: Reveal

    func testFormulaLandsOnePartAtATimeAndIsSpokenAsItLands() async {
        let speech = MockSpeech()
        let vm = makeViewModel(game: game([Formula(a: 10, op: .plus, b: 20)]), speech: speech)
        XCTAssertEqual(vm.revealedParts, 0)
        vm.begin()
        await waitFor("all three parts") { vm.revealedParts == 3 }
        XCTAssertEqual(speech.spokenTexts.prefix(3), ["ten", "plus", "twenty"])
        vm.cancel()
    }

    func testTilesAreLiveBeforeTheFormulaFinishesLanding() async {
        let speech = MockSpeech()
        let vm = makeViewModel(game: game([Formula(a: 3, op: .plus, b: 5)]), speech: speech)
        vm.begin()
        await waitFor("tiles dealt") { !vm.choices.isEmpty }
        XCTAssertEqual(vm.state, .revealing)
        XCTAssertTrue(vm.isAnswerable, "the child can answer during the reveal")
        vm.choose(correctChoice(vm)!)
        XCTAssertEqual(vm.state, .celebrating)
        await waitFor("completed") { vm.state == .completed }
    }

    func testNextFormulaIsPrerenderedWhileTheCurrentOneIsAnswered() async {
        let speech = MockSpeech()
        let formulas = [Formula(a: 1, op: .plus, b: 1), Formula(a: 40, op: .plus, b: 2)]
        let vm = makeViewModel(game: game(formulas), speech: speech)
        vm.begin()
        await waitFor("second sum prerendered") {
            speech.prefetched.contains("forty") && speech.prefetched.contains("two")
        }
        XCTAssertEqual(vm.session.currentIndex, 0, "still on the first sum")
        vm.cancel()
    }

    // MARK: Wrong picks

    func testWrongPickStaysOnScreenThenSwitchesItselfOff() async {
        let speech = MockSpeech()
        let vm = makeViewModel(game: game([Formula(a: 3, op: .plus, b: 5)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }

        let wrong = wrongChoice(vm)!
        let missesBefore = vm.missTrigger
        vm.choose(wrong)
        XCTAssertEqual(vm.wrongValue, wrong.value, "the tile flashes where it stands")
        XCTAssertFalse(vm.disabledValues.contains(wrong.value), "not switched off yet")
        XCTAssertEqual(vm.missTrigger, missesBefore + 1)
        XCTAssertEqual(vm.state, .choosing, "a miss never leaves the choosing state")

        await waitFor("switched off") { vm.disabledValues.contains(wrong.value) }
        XCTAssertNil(vm.wrongValue)
        XCTAssertTrue(vm.choices.contains { $0.value == wrong.value }, "still on screen, just off")
        vm.cancel()
    }

    func testTappingAnOffTileDoesNothing() async {
        let speech = MockSpeech()
        let vm = makeViewModel(game: game([Formula(a: 3, op: .plus, b: 5)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        let wrong = wrongChoice(vm)!
        vm.choose(wrong)
        await waitFor("switched off") { vm.disabledValues.contains(wrong.value) }

        let missesBefore = vm.missTrigger
        vm.choose(wrong)
        XCTAssertEqual(vm.missTrigger, missesBefore, "an off tile is inert")
        vm.cancel()
    }

    func testLastTileStandingPulses() async {
        let speech = MockSpeech()
        let vm = makeViewModel(game: game([Formula(a: 3, op: .plus, b: 5)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }

        for wrong in vm.choices.filter({ !$0.isCorrect }) {
            vm.choose(wrong)
            await waitFor("off") { vm.disabledValues.contains(wrong.value) }
        }
        XCTAssertTrue(vm.pulseCorrect, "the only tile left guides the child")
        XCTAssertEqual(vm.remainingChoices.map(\.isCorrect), [true])

        vm.choose(correctChoice(vm)!)
        await waitFor("completed") { vm.state == .completed }
    }

    func testCorrectPickMarksTheWinningTile() async {
        let speech = MockSpeech()
        let vm = makeViewModel(game: game([Formula(a: 2, op: .plus, b: 2)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        let correct = correctChoice(vm)!
        vm.choose(correct)
        XCTAssertEqual(vm.wonValue, correct.value, "the winning tile gets the fireworks")
        await waitFor("completed") { vm.state == .completed }
    }

    // MARK: Games

    func testGameAdvancesAndCompletes() async {
        let speech = MockSpeech()
        let formulas = [Formula(a: 1, op: .plus, b: 1), Formula(a: 2, op: .plus, b: 2)]
        let vm = makeViewModel(game: game(formulas), speech: speech)
        vm.begin()
        await waitFor("choosing 1") { vm.state == .choosing }
        vm.choose(correctChoice(vm)!)
        await waitFor("choosing 2") { vm.state == .choosing && vm.session.currentIndex == 1 }
        vm.choose(correctChoice(vm)!)
        await waitFor("completed") { vm.state == .completed }
        XCTAssertEqual(vm.session.completedCount, 2)
    }

    func testATenSumRunEndsOnTheEndScreen() async {
        let speech = MockSpeech()
        let spec = SumRunSpec(preset: SumCatalog.presets[0], operators: [.plus])
        let vm = makeViewModel(game: spec.makeGame(), speech: speech)
        XCTAssertEqual(vm.session.total, 10)
        vm.begin()
        for index in 0..<10 {
            await waitFor("choosing \(index)") { vm.state == .choosing && vm.session.currentIndex == index }
            vm.choose(correctChoice(vm)!)
        }
        await waitFor("completed") { vm.state == .completed }
        XCTAssertEqual(vm.session.completedCount, 10)
    }

    func testSkipAdvancesWithoutCelebration() async {
        let speech = MockSpeech()
        let vm = makeViewModel(game: game([Formula(a: 1, op: .plus, b: 1)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        vm.skip()
        await waitFor("completed") { vm.state == .completed }
        XCTAssertEqual(vm.session.skippedCount, 1)
        XCTAssertEqual(vm.session.completedCount, 0)
    }

    func testPlayAgainDealsAFreshRoundForAPreset() async {
        let speech = MockSpeech()
        let spec = SumRunSpec(preset: SumCatalog.presets[3], operators: SumOperator.allCases)
        let first = spec.makeGame()
        let vm = makeViewModel(game: first, speech: speech, regenerate: { spec.makeGame() })
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        vm.skip()

        vm.restart()
        await waitFor("choosing after restart") { vm.state == .choosing }
        XCTAssertEqual(vm.session.currentIndex, 0)
        XCTAssertEqual(vm.session.total, 10)
        XCTAssertNotEqual(vm.session.game?.formulas, first.formulas, "play again deals new sums")
        vm.cancel()
    }

    func testPlayAgainReplaysAFixedPathExactly() async {
        let speech = MockSpeech()
        let fixed = game([Formula(a: 1, op: .plus, b: 1), Formula(a: 2, op: .plus, b: 2)])
        let vm = makeViewModel(game: fixed, speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        vm.skip()
        vm.restart()
        await waitFor("choosing after restart") { vm.state == .choosing }
        XCTAssertEqual(vm.session.game?.formulas, fixed.formulas)
        vm.cancel()
    }

    // MARK: Interruption

    func testInterruptionPausesAndResumes() async {
        let speech = MockSpeech()
        let vm = makeViewModel(game: game([Formula(a: 4, op: .plus, b: 4)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        vm.pauseForInterruption()
        XCTAssertTrue(vm.isPausedForInterruption)
        vm.resumeAfterInterruption()
        await waitFor("choosing again") { vm.state == .choosing }
        XCTAssertFalse(vm.isPausedForInterruption)
        XCTAssertEqual(vm.revealedParts, 3, "a resumed sum is fully on screen")
        vm.cancel()
    }

    func testReplaySaysTheWholeFormula() async {
        let speech = MockSpeech()
        let vm = makeViewModel(game: game([Formula(a: 2, op: .plus, b: 2)]), speech: speech)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        vm.replay()
        await waitFor("respoken") { speech.spokenTexts.last == "two plus two is" }
        vm.cancel()
    }

    // MARK: Voice answering

    func testVoiceAnswerSelectsCorrectTile() async {
        let speech = MockSpeech()
        speech.scriptedAttempts = [[TikoTranscriptUpdate(transcript: "eight", isFinal: false)]]
        let vm = makeViewModel(game: game([Formula(a: 3, op: .plus, b: 5)]), speech: speech, mode: .voice)
        vm.begin()
        await waitFor("completed via voice") { vm.state == .completed }
        XCTAssertEqual(vm.session.completedCount, 1)
    }

    func testVoiceDisabledNeverListens() async {
        let speech = MockSpeech()
        let vm = makeViewModel(game: game([Formula(a: 3, op: .plus, b: 5)]), speech: speech, mode: .choice)
        vm.begin()
        await waitFor("choosing") { vm.state == .choosing }
        XCTAssertEqual(speech.listenCount, 0)
        vm.cancel()
    }

    func testVoiceIgnoresWrongWords() async {
        let speech = MockSpeech()
        speech.scriptedAttempts = [[TikoTranscriptUpdate(transcript: "banana", isFinal: true)]]
        let vm = makeViewModel(game: game([Formula(a: 3, op: .plus, b: 5)]), speech: speech, mode: .voice)
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
            game: SumGame(id: "t", emoji: "🧪", formulas: [Formula(a: 3, op: .plus, b: 5)]),
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
        XCTAssertEqual(vm.state, .choosing)

        vm.typeDigit(9)
        vm.submitTyped()
        XCTAssertTrue(vm.showsChoiceTiles, "third round falls back to guided tiles")
        XCTAssertLessThanOrEqual(vm.remainingChoices.count, 2, "fallback narrows to two tiles")
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
