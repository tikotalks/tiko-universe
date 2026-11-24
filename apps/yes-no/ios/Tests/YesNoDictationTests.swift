import XCTest
import TikoKit
import TikoSpeechKit
@testable import TikoYesNo

/// Dictating a question (Req 23), against a scripted speech stack so no
/// microphone, permission prompt or recognizer is involved.
@MainActor
final class YesNoDictationTests: XCTestCase {

    /// What is heard reaches the caller as it grows, and the attempt ends in
    /// idle once the recognizer is done.
    func testHeardWordsReachTheQuestion() async {
        let speech = ScriptedSpeech()
        speech.script = [
            TikoTranscriptUpdate(transcript: "Do you", isFinal: false),
            TikoTranscriptUpdate(transcript: "Do you want juice", isFinal: true),
        ]
        let dictation = YesNoDictation(speech: speech)
        var heard: [String] = []

        dictation.toggle(languageCode: "en") { heard.append($0) }
        await settle { dictation.state == .idle && !heard.isEmpty }

        XCTAssertEqual(heard, ["Do you", "Do you want juice"])
        XCTAssertEqual(dictation.state, .idle)
    }

    /// The speaker stopping is what ends the attempt: no second tap needed.
    func testAPauseEndsTheAttempt() async {
        let speech = ScriptedSpeech()
        speech.script = [TikoTranscriptUpdate(transcript: "Are you tired", isFinal: false)]
        speech.staysOpen = true
        let dictation = YesNoDictation(speech: speech, pause: 0.1)

        dictation.toggle(languageCode: "en") { _ in }
        await settle { dictation.state == .listening }
        XCTAssertEqual(dictation.state, .listening)

        await settle { dictation.state == .idle }
        XCTAssertEqual(dictation.state, .idle)
        XCTAssertGreaterThanOrEqual(speech.stopCount, 1)
    }

    /// A second tap while listening stops it.
    func testSecondTapStopsListening() async {
        let speech = ScriptedSpeech()
        speech.staysOpen = true
        let dictation = YesNoDictation(speech: speech)

        dictation.toggle(languageCode: "en") { _ in }
        await settle { dictation.state == .listening }
        dictation.toggle(languageCode: "en") { _ in }

        XCTAssertEqual(dictation.state, .idle)
    }

    /// A refused permission is reported, not swallowed, and nothing listens.
    func testRefusedPermissionIsReported() async {
        let speech = ScriptedSpeech()
        speech.permission = .notDetermined
        speech.grantsWhenAsked = false
        let dictation = YesNoDictation(speech: speech)

        dictation.toggle(languageCode: "en") { _ in }
        await settle { dictation.state == .denied }

        XCTAssertEqual(dictation.state, .denied)
        XCTAssertEqual(speech.listenCount, 0)
    }

    /// An attempt that never really listened says so instead of looking idle.
    func testFailedAttemptIsReported() async {
        let speech = ScriptedSpeech()
        speech.script = [TikoTranscriptUpdate(transcript: "", isFinal: true, didFail: true)]
        let dictation = YesNoDictation(speech: speech)

        dictation.toggle(languageCode: "en") { _ in }
        await settle { dictation.state == .unavailable }

        XCTAssertEqual(dictation.state, .unavailable)
    }

    /// A language with no recognizer does not get a microphone at all.
    func testLanguageWithoutRecognizerCannotListen() {
        let speech = ScriptedSpeech()
        speech.availability = .unsupportedLocale(suggestedLanguageCode: "en")
        let dictation = YesNoDictation(speech: speech)

        dictation.prepare(languageCode: "mt")
        XCTAssertFalse(dictation.canListen)

        speech.availability = .available(onDevice: true)
        dictation.prepare(languageCode: "en")
        XCTAssertTrue(dictation.canListen)
    }

    /// Waits, in short turns, until `condition` holds or two seconds pass.
    private func settle(_ condition: () -> Bool) async {
        for _ in 0..<200 where !condition() {
            try? await Task.sleep(nanoseconds: 10_000_000)
        }
    }
}

@MainActor
private final class ScriptedSpeech: TikoSpeechServicing {
    var onAudioLevel: ((Float) -> Void)?
    var permission: TikoPermissionState = .granted
    var grantsWhenAsked = true
    var availability: TikoRecognitionAvailability = .available(onDevice: true)
    var script: [TikoTranscriptUpdate] = []
    /// Keeps the stream open after the script, like a recognizer still listening.
    var staysOpen = false
    private(set) var listenCount = 0
    private(set) var stopCount = 0
    private var open: AsyncStream<TikoTranscriptUpdate>.Continuation?

    func permissionState() -> TikoPermissionState { permission }
    func requestPermissions() async -> Bool { grantsWhenAsked }
    func recognitionAvailability(languageCode: String) -> TikoRecognitionAvailability { availability }
    func speak(_ text: String, languageCode: String) async {}
    func prefetch(texts: [String], languageCode: String) async {}

    func listen(languageCode: String, contextualWords: [String], timeout: TimeInterval) -> AsyncStream<TikoTranscriptUpdate> {
        listenCount += 1
        return AsyncStream { continuation in
            for update in script { continuation.yield(update) }
            if staysOpen {
                open = continuation
            } else {
                continuation.finish()
            }
        }
    }

    func stopListening() {
        stopCount += 1
        open?.finish()
        open = nil
    }

    func stopAll() { stopListening() }
}
