import XCTest
@testable import TikoSay

// MARK: - Scripted speech mock

@MainActor
private final class MockSpeechService: SaySpeechServicing {
    var onAudioLevel: ((Float) -> Void)?
    var permission: SayPermissionState = .granted
    var permissionRequestResult = true
    var availabilityByLanguage: [String: SayRecognitionAvailability] = [:]
    var defaultAvailability: SayRecognitionAvailability = .available(onDevice: true)

    private(set) var spokenTexts: [String] = []
    private(set) var listenLanguages: [String] = []
    private(set) var listenContextualWords: [[String]] = []
    private(set) var stopAllCount = 0
    private(set) var permissionRequestCount = 0

    /// Each entry scripts one listen attempt. When exhausted, listening parks
    /// (stream stays open) so tests can observe a stable `.listening` state.
    var scriptedAttempts: [[SayTranscriptUpdate]] = []
    private var openContinuations: [AsyncStream<SayTranscriptUpdate>.Continuation] = []

    func permissionState() -> SayPermissionState { permission }

    func requestPermissions() async -> Bool {
        permissionRequestCount += 1
        return permissionRequestResult
    }

    func recognitionAvailability(languageCode: String) -> SayRecognitionAvailability {
        availabilityByLanguage[languageCode] ?? defaultAvailability
    }

    func speak(_ text: String, languageCode: String) async {
        spokenTexts.append(text)
    }

    private(set) var prefetchedTexts: [String] = []

    func prefetch(texts: [String], languageCode: String) async {
        prefetchedTexts.append(contentsOf: texts)
    }

    func listen(languageCode: String, contextualWords: [String], timeout: TimeInterval) -> AsyncStream<SayTranscriptUpdate> {
        listenLanguages.append(languageCode)
        listenContextualWords.append(contextualWords)
        if scriptedAttempts.isEmpty {
            return AsyncStream { continuation in
                self.openContinuations.append(continuation)
            }
        }
        let updates = scriptedAttempts.removeFirst()
        return AsyncStream { continuation in
            for update in updates {
                continuation.yield(update)
            }
            continuation.finish()
        }
    }

    func stopListening() {
        for continuation in openContinuations {
            continuation.finish()
        }
        openContinuations = []
    }

    func stopAll() {
        stopAllCount += 1
        stopListening()
    }
}

// MARK: - Tests

@MainActor
final class PracticeViewModelTests: XCTestCase {
    private let category = SayCategory(id: "animals", titleKey: "say.category.animals", emoji: "🐾", sortOrder: 0)

    private func card(
        id: String = "animal_dog",
        title: String = "Dog",
        speak: String = "Dog",
        listen: [String] = ["dog", "doggy"]
    ) -> SayCard {
        SayCard(
            id: id, categoryID: "animals", title: title, speakText: speak,
            listenFor: listen, emoji: "🐶", difficulty: 1,
            isCustom: false, isHidden: false, sortOrder: 0
        )
    }

    private func makeViewModel(
        cards: [SayCard],
        speech: MockSpeechService,
        language: String = "en"
    ) -> PracticeViewModel {
        PracticeViewModel(
            category: category,
            cards: cards,
            languageCode: language,
            speech: speech,
            timings: .instant,
            shuffle: false
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

    // MARK: Initial state

    func testInitialStateIsIdle() {
        let vm = makeViewModel(cards: [card()], speech: MockSpeechService())
        XCTAssertEqual(vm.state, .idle)
    }

    func testEmptyCardListCompletesImmediately() {
        let vm = makeViewModel(cards: [], speech: MockSpeechService())
        vm.begin()
        XCTAssertEqual(vm.state, .completed)
    }

    // MARK: Speaking → listening

    func testSpeaksTargetThenListensWithContextualWords() async {
        let speech = MockSpeechService()
        let vm = makeViewModel(cards: [card(speak: "the dog")], speech: speech)
        vm.begin()
        await waitFor("listening") { vm.state == .listening }
        XCTAssertEqual(speech.spokenTexts, ["the dog"])
        XCTAssertEqual(speech.listenContextualWords.first, ["dog", "doggy"])
        vm.cancel()
    }

    // MARK: Correct result

    func testMatchCelebratesAndCompletesSession() async {
        let speech = MockSpeechService()
        speech.scriptedAttempts = [[SayTranscriptUpdate(transcript: "dog", isFinal: false)]]
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("completed") { vm.state == .completed }
        XCTAssertTrue(vm.session.completedCardIDs.contains("animal_dog"))
        XCTAssertEqual(vm.lastMatchType, .exact)
    }

    func testAlternativeAndPhraseMatchesAccepted() async {
        let speech = MockSpeechService()
        speech.scriptedAttempts = [[SayTranscriptUpdate(transcript: "a doggy", isFinal: false)]]
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("completed") { vm.state == .completed }
        XCTAssertNotNil(vm.lastMatchType)
    }

    // MARK: Incorrect result → calm retry

    func testIncorrectResultRetriesCalmly() async {
        let speech = MockSpeechService()
        speech.scriptedAttempts = [[SayTranscriptUpdate(transcript: "hat", isFinal: true)]]
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("second listen") { vm.state == .listening && vm.attempt == 2 }
        XCTAssertEqual(vm.session.attemptsByCard["animal_dog"], 2)
        XCTAssertFalse(vm.skipProminent)
        vm.cancel()
    }

    func testThirdAttemptAutomaticallyReplaysTarget() async {
        let speech = MockSpeechService()
        speech.scriptedAttempts = [
            [SayTranscriptUpdate(transcript: "", isFinal: true)],
            [SayTranscriptUpdate(transcript: "", isFinal: true)],
        ]
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("attempt 3 listening") { vm.attempt == 3 && vm.state == .listening }
        XCTAssertEqual(speech.spokenTexts.count, 2, "target replayed automatically on the third attempt")
        vm.cancel()
    }

    func testFifthAttemptMakesSkipProminent() async {
        let speech = MockSpeechService()
        speech.scriptedAttempts = Array(
            repeating: [SayTranscriptUpdate(transcript: "", isFinal: true)],
            count: 4
        )
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("attempt 5") { vm.attempt == 5 }
        XCTAssertTrue(vm.skipProminent)
        vm.cancel()
    }

    func testRelaxedMatcherOnFourthAttempt() async {
        let speech = MockSpeechService()
        speech.scriptedAttempts = [
            [SayTranscriptUpdate(transcript: "", isFinal: true)],
            [SayTranscriptUpdate(transcript: "", isFinal: true)],
            [SayTranscriptUpdate(transcript: "elefant", isFinal: true)],
            [SayTranscriptUpdate(transcript: "elefant", isFinal: false)],
        ]
        let elephant = card(id: "animal_elephant", title: "Elephant", speak: "Elephant", listen: ["elephant"])
        let vm = makeViewModel(cards: [elephant], speech: speech)
        vm.begin()
        // "elefant" (similarity 0.75) is rejected by the standard matcher on
        // attempt 3 but accepted by the relaxed matcher on attempt 4.
        await waitFor("completed") { vm.state == .completed }
        XCTAssertEqual(vm.lastMatchType, .fuzzy)
    }

    // MARK: Skip

    func testSkipAlwaysAdvances() async {
        let speech = MockSpeechService()
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("listening") { vm.state == .listening }
        vm.skip()
        await waitFor("completed") { vm.state == .completed }
        XCTAssertTrue(vm.session.skippedCardIDs.contains("animal_dog"))
    }

    // MARK: Next item

    func testAdvancesToNextCardAfterMatch() async {
        let speech = MockSpeechService()
        speech.scriptedAttempts = [[SayTranscriptUpdate(transcript: "dog", isFinal: false)]]
        let cat = card(id: "animal_cat", title: "Cat", speak: "Cat", listen: ["cat"])
        let vm = makeViewModel(cards: [card(), cat], speech: speech)
        vm.begin()
        await waitFor("second card listening") { vm.session.currentIndex == 1 && vm.state == .listening }
        XCTAssertEqual(vm.currentCard?.id, "animal_cat")
        XCTAssertEqual(vm.attempt, 1, "attempt counter resets per card")
        XCTAssertEqual(speech.spokenTexts, ["Dog", "Cat"])
        vm.cancel()
    }

    // MARK: Permission handling

    func testDeniedPermissionShowsRecovery() {
        let speech = MockSpeechService()
        speech.permission = .denied
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        XCTAssertEqual(vm.state, .permissionDenied)
    }

    /// Guideline 5.1.1(iv): an undecided permission goes straight to the system
    /// prompt, with no screen in between that could be dismissed instead.
    func testUndecidedPermissionAsksImmediately() async {
        let speech = MockSpeechService()
        speech.permission = .notDetermined
        speech.permissionRequestResult = true
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        XCTAssertEqual(vm.state, .requestingPermission, "no interstitial before the system prompt")
        await waitFor("prompt requested") { speech.permissionRequestCount == 1 }
        vm.cancel()
    }

    func testPermissionRequestDenialShowsRecovery() async {
        let speech = MockSpeechService()
        speech.permission = .notDetermined
        speech.permissionRequestResult = false
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("denied") { vm.state == .permissionDenied }
    }

    func testPermissionGrantStartsPractice() async {
        let speech = MockSpeechService()
        speech.permission = .notDetermined
        speech.permissionRequestResult = true
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("listening") { vm.state == .listening }
        vm.cancel()
    }

    func testGrantingInSettingsResumesPracticeOnReturn() async {
        let speech = MockSpeechService()
        speech.permission = .denied
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        XCTAssertEqual(vm.state, .permissionDenied)

        speech.permission = .granted
        vm.recheckPermissionsAfterSettings()
        await waitFor("listening") { vm.state == .listening }
        vm.cancel()
    }

    // MARK: Recognition availability

    func testUnavailableRecognizerShowsUnavailableState() {
        let speech = MockSpeechService()
        speech.defaultAvailability = .unavailable
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        XCTAssertEqual(vm.state, .recognitionUnavailable)
    }

    func testUnsupportedLocaleFallsBackToSuggestionAndNotifiesParent() async {
        let speech = MockSpeechService()
        speech.availabilityByLanguage = [
            "mt": .unsupportedLocale(suggestedLanguageCode: "en"),
            "en": .available(onDevice: true),
        ]
        let vm = makeViewModel(cards: [card()], speech: speech, language: "mt")
        vm.begin()
        await waitFor("listening") { vm.state == .listening }
        XCTAssertEqual(vm.recognitionFallbackLanguage, "en")
        XCTAssertEqual(speech.listenLanguages.first, "en", "recognition uses the fallback language")
        vm.cancel()
    }

    func testRepeatedListenStartFailuresShowUnavailableWithoutCountingAttempts() async {
        // Regression: a broken audio route (e.g. simulator input with a 0 Hz
        // format) must surface the calm unavailable screen — never a crash
        // and never consumed attempts.
        let speech = MockSpeechService()
        speech.scriptedAttempts = Array(
            repeating: [SayTranscriptUpdate(transcript: "", isFinal: true, didFail: true)],
            count: 3
        )
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("unavailable") { vm.state == .recognitionUnavailable }
        XCTAssertEqual(vm.attempt, 1, "listen-start failures are not the child's attempts")
    }

    func testSingleListenStartFailureRecoversQuietly() async {
        let speech = MockSpeechService()
        speech.scriptedAttempts = [
            [SayTranscriptUpdate(transcript: "", isFinal: true, didFail: true)],
            [SayTranscriptUpdate(transcript: "dog", isFinal: false)],
        ]
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("completed") { vm.state == .completed }
        XCTAssertTrue(vm.session.completedCardIDs.contains("animal_dog"))
    }

    func testUnsupportedLocaleWithoutSuggestionIsUnavailable() {
        let speech = MockSpeechService()
        speech.defaultAvailability = .unsupportedLocale(suggestedLanguageCode: nil)
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        XCTAssertEqual(vm.state, .recognitionUnavailable)
    }

    // MARK: Interruption / backgrounding

    func testInterruptionPausesWithoutCountingAnAttempt() async {
        let speech = MockSpeechService()
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("listening") { vm.state == .listening }
        let attemptBefore = vm.attempt

        vm.pauseForInterruption()
        XCTAssertTrue(vm.isPausedForInterruption)
        XCTAssertEqual(vm.state, .idle)
        XCTAssertGreaterThan(speech.stopAllCount, 0, "capture stops on interruption")

        vm.resumeAfterInterruption()
        await waitFor("listening again") { vm.state == .listening }
        XCTAssertEqual(vm.attempt, attemptBefore, "interruption never counts as a failed attempt")
        XCTAssertEqual(vm.currentCard?.id, "animal_dog", "the same card stays active")
        vm.cancel()
    }

    // MARK: Restart

    func testRestartSessionResetsProgress() async {
        let speech = MockSpeechService()
        speech.scriptedAttempts = [[SayTranscriptUpdate(transcript: "dog", isFinal: false)]]
        let vm = makeViewModel(cards: [card()], speech: speech)
        vm.begin()
        await waitFor("completed") { vm.state == .completed }

        vm.restartSession()
        await waitFor("listening after restart") { vm.state == .listening }
        XCTAssertTrue(vm.session.completedCardIDs.isEmpty)
        XCTAssertEqual(vm.session.currentIndex, 0)
        vm.cancel()
    }
}
