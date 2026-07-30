import CoreGraphics
import Foundation
import SwiftUI
import TikoCore
import TikoKit

/// Drives one glyph: holds the engine session, the ink, and what to say.
///
/// The engine decides what counts; this decides what the child sees and hears.
/// That split is deliberate — the design principles forbid a spoken "wrong", a
/// red cross or a failure animation, so every setback tag maps to exactly one
/// soft response here and there is nowhere else for a scolding to creep in.
@MainActor
final class TraceViewModel: ObservableObject {

    /// Ink already committed, per stroke, as progress along that stroke.
    @Published private(set) var completedStrokes: [Int: CGFloat] = [:]
    @Published private(set) var currentStroke: Int = 0
    @Published private(set) var currentProgress: CGFloat = 0
    @Published private(set) var isComplete = false
    @Published private(set) var celebrationTrigger = 0
    @Published private(set) var crossedKeyPoints: Set<Int> = []
    /// Set briefly when the child strays; the view uses it for a gentle nudge,
    /// never for a correction.
    @Published private(set) var setbackTrigger = 0

    let glyph: Glyph
    let viewBox: CGSize
    private(set) var strokePoints: [[CGPoint]] = []
    private(set) var keyPoints: [[CGPoint]] = []

    private var session: TraceSession
    private let settings: TraceSettings
    private var startedAt = Date()

    init(glyph: Glyph, viewBox: CGSize, settings: TraceSettings) {
        self.glyph = glyph
        self.viewBox = viewBox
        self.settings = settings
        self.session = StrokeCore.shared.createSession(
            glyph: glyph, settings: settings, attempt: 1
        )
        for i in 0..<Int(glyph.strokeCount) {
            strokePoints.append(WriteEngine.points(glyph.polyline(strokeIndex: Int32(i))))
            keyPoints.append(WriteEngine.points(glyph.keyPoints(strokeIndex: Int32(i))))
        }
    }

    var strokeCount: Int { Int(glyph.strokeCount) }

    /// The point the child should put their finger on next.
    var startPoint: CGPoint? {
        guard currentStroke < strokePoints.count else { return nil }
        return strokePoints[currentStroke].first
    }

    func begin(at point: CGPoint) {
        guard !isComplete else { return }
        apply(WriteEngine.event(from: session.begin(x: point.x, y: point.y)))
    }

    func move(to point: CGPoint, at time: TimeInterval) {
        guard !isComplete else { return }
        let ms = Int64(time * 1000)
        apply(WriteEngine.event(from: session.onPoint(x: point.x, y: point.y, tMs: ms)))
    }

    func lift() {
        guard !isComplete else { return }
        apply(WriteEngine.event(from: session.lift()))
    }

    func restart() {
        session = StrokeCore.shared.createSession(glyph: glyph, settings: settings, attempt: 1)
        completedStrokes = [:]
        currentStroke = 0
        currentProgress = 0
        crossedKeyPoints = []
        isComplete = false
        startedAt = Date()
    }

    /// Accuracy for Parent Mode. Never shown to the child.
    var attemptResult: AttemptResult? { session.result() }

    private func apply(_ event: WriteEngine.Event) {
        switch event.tag {
        case .progress, .beginOK:
            currentStroke = Int(session.currentStrokeIndex)
            currentProgress = CGFloat(session.currentProgress)

        case .keyPoint(let index):
            currentStroke = Int(session.currentStrokeIndex)
            currentProgress = CGFloat(session.currentProgress)
            crossedKeyPoints.insert(index)
            TikoFeedback.playPop()

        case .strokeComplete:
            completedStrokes[event.strokeIndex] = 1.0
            currentStroke = Int(session.currentStrokeIndex)
            currentProgress = 0
            crossedKeyPoints = []
            TikoFeedback.playPop()

        case .glyphComplete:
            completedStrokes[event.strokeIndex] = 1.0
            currentProgress = 1
            isComplete = true
            celebrationTrigger += 1
            TikoFeedback.playSuccess()

        case .reset:
            currentProgress = CGFloat(session.currentProgress)
            crossedKeyPoints = []
            setbackTrigger += 1
            TikoFeedback.playRetry()

        case .offPath, .wrongDirection, .beginWrongPlace, .liftedEarly, .strokeOutOfOrder:
            // One soft acknowledgement, and the ink simply waits. Nothing is
            // taken away, nothing is said.
            currentProgress = CGFloat(session.currentProgress)
            setbackTrigger += 1

        case .ignored:
            break
        }
    }
}
