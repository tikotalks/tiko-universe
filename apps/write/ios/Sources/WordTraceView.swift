import SwiftUI
import TikoCore
import TikoKit
import UIKit

/// Writing a whole word, on one line.
///
/// The word sits on a single baseline the way it would on paper, and the canvas
/// slides so the letter in hand stays centred. That keeps every letter the same
/// generous size on a phone as on an iPad — the alternative, shrinking the word
/// to fit, gives a six-letter name about 55pt per letter, which is below what a
/// finger can trace accurately.
@MainActor
final class WordTraceModel: ObservableObject {
    @Published private(set) var currentIndex = 0
    @Published private(set) var currentProgress: CGFloat = 0
    @Published private(set) var currentStroke = 0
    @Published private(set) var isComplete = false
    @Published private(set) var celebrationTrigger = 0
    @Published private(set) var setbackTrigger = 0
    @Published private(set) var completedLetters = 0
    @Published private(set) var crossedKeyPoints: Set<Int> = []

    let word: WriteWordStore.Word
    let letterSize: CGSize
    private(set) var letters: [Glyph] = []
    /// Flattened geometry per letter, in that letter's own space.
    private(set) var letterStrokes: [[[CGPoint]]] = []
    private(set) var letterKeyPoints: [[[CGPoint]]] = []

    private var session: WordSession

    init?(word: WriteWordStore.Word, pack: GlyphPack, settings: TraceSettings) {
        self.word = word
        self.letterSize = CGSize(width: pack.viewBoxWidth, height: pack.viewBoxHeight)
        guard let s = try? StrokeCore.shared.createWordSession(
            pack: pack, glyphIds: word.glyphIDs, settings: settings
        ) else { return nil }
        self.session = s
        for i in 0..<Int(s.letterCount) {
            let glyph = s.glyphAt(index: Int32(i))
            letters.append(glyph)
            letterStrokes.append((0..<Int(glyph.strokeCount)).map {
                WriteEngine.points(glyph.polyline(strokeIndex: Int32($0)))
            })
            letterKeyPoints.append((0..<Int(glyph.strokeCount)).map {
                WriteEngine.points(glyph.keyPoints(strokeIndex: Int32($0)))
            })
        }
    }

    var letterCount: Int { letters.count }
    var advanceWidth: CGFloat { CGFloat(session.advanceWidth) }

    func originX(_ index: Int) -> CGFloat { CGFloat(session.originX(index: Int32(index))) }
    func isLetterComplete(_ index: Int) -> Bool { session.isLetterComplete(index: Int32(index)) }

    /// The point the child should start on next, in word space.
    var startPoint: CGPoint? {
        guard currentIndex < letterStrokes.count,
              currentStroke < letterStrokes[currentIndex].count,
              let p = letterStrokes[currentIndex][currentStroke].first else { return nil }
        return CGPoint(x: p.x + originX(currentIndex), y: p.y)
    }

    func begin(at p: CGPoint) { apply(session.begin(x: p.x, y: p.y)) }
    func move(to p: CGPoint, at t: TimeInterval) { apply(session.onPoint(x: p.x, y: p.y, tMs: Int64(t * 1000))) }
    func lift() { apply(session.lift()) }

    func selectLetter(_ index: Int) {
        guard session.selectLetter(index: Int32(index)) else { return }
        syncFromSession()
    }

    func restart() {
        session.restart()
        isComplete = false
        completedLetters = 0
        syncFromSession()
    }

    private func apply(_ raw: StrokeEvent) {
        let event = WriteEngine.event(from: raw)
        switch event.tag {
        case .keyPoint(let i):
            crossedKeyPoints.insert(i)
            TikoFeedback.playPop()
        case .strokeComplete:
            // Either a stroke within a letter, or a whole letter finished. Both
            // deserve the same small pop — the celebration is for the word.
            TikoFeedback.playPop()
            crossedKeyPoints = []
        case .glyphComplete:
            completedLetters = letterCount
            isComplete = true
            celebrationTrigger += 1
            TikoFeedback.playSuccess()
        case .reset:
            crossedKeyPoints = []
            setbackTrigger += 1
            TikoFeedback.playRetry()
        case .offPath, .wrongDirection, .beginWrongPlace, .liftedEarly, .strokeOutOfOrder:
            setbackTrigger += 1
        case .progress, .beginOK, .ignored:
            break
        }
        syncFromSession()
    }

    private func syncFromSession() {
        currentIndex = Int(session.currentIndex)
        currentProgress = CGFloat(session.currentProgress)
        currentStroke = Int(session.currentStrokeIndex)
        var done = 0
        for i in 0..<letterCount where session.isLetterComplete(index: Int32(i)) { done = i + 1 }
        completedLetters = done
    }
}

/// The word canvas. Word space is one long strip; the view slides it so the
/// active letter is centred and draws the neighbours either side for context.
struct WordCanvasView: UIViewRepresentable {
    @ObservedObject var model: WordTraceModel
    let tint: Color

    func makeUIView(context: Context) -> WordInputView {
        let v = WordInputView()
        v.backgroundColor = .clear
        v.isMultipleTouchEnabled = false
        v.model = model
        v.tint = UIColor(tint)
        return v
    }

    func updateUIView(_ uiView: WordInputView, context: Context) {
        uiView.model = model
        uiView.tint = UIColor(tint)
        uiView.follow()
    }
}

final class WordInputView: UIView {
    var model: WordTraceModel? { didSet { setNeedsDisplay() } }
    var tint: UIColor = .systemGreen

    /// Word-space x currently at the centre of the view. Animated so the word
    /// slides rather than jumping when a letter is finished.
    private var centreX: CGFloat = 0
    private var targetCentreX: CGFloat = 0
    private var link: CADisplayLink?

    /// How much of the viewBox height fills the view. Below 1 so a neighbouring
    /// letter peeks in and the child can see the word is a word.
    private var scale: CGFloat {
        guard let model, model.letterSize.height > 0 else { return 1 }
        return (bounds.height * 0.78) / model.letterSize.height
    }

    private var toView: CGAffineTransform {
        guard let model else { return .identity }
        let s = scale
        let dy = (bounds.height - model.letterSize.height * s) / 2
        return CGAffineTransform(translationX: bounds.midX - centreX * s, y: dy).scaledBy(x: s, y: s)
    }

    private func boxPoint(_ touch: UITouch) -> CGPoint {
        touch.location(in: self).applying(toView.inverted())
    }

    /// Keeps the letter in hand centred.
    func follow() {
        guard let model else { return }
        targetCentreX = model.originX(model.currentIndex) + model.advanceWidth / 2
        if centreX == 0 && model.currentIndex == 0 { centreX = targetCentreX }
        startLink()
        setNeedsDisplay()
    }

    private func startLink() {
        guard link == nil, abs(centreX - targetCentreX) > 0.5 else { return }
        let l = CADisplayLink(target: self, selector: #selector(step))
        l.add(to: .main, forMode: .common)
        link = l
    }

    @objc private func step() {
        centreX += (targetCentreX - centreX) * 0.18
        if abs(centreX - targetCentreX) < 0.5 {
            centreX = targetCentreX
            link?.invalidate()
            link = nil
        }
        setNeedsDisplay()
    }

    // MARK: - Input

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, let model else { return }
        model.begin(at: boxPoint(touch))
        follow()
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, let model else { return }
        for sample in event?.coalescedTouches(for: touch) ?? [touch] {
            model.move(to: boxPoint(sample), at: sample.timestamp)
        }
        follow()
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        model?.lift(); follow()
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        model?.lift(); follow()
    }

    // MARK: - Drawing

    override func draw(_ rect: CGRect) {
        guard let ctx = UIGraphicsGetCurrentContext(), let model else { return }
        let t = toView
        let width = max(10, model.letterSize.height * scale * 0.085)

        // Baseline, so the word sits on a line like writing on paper.
        let baselineY = (model.letterSize.height * 0.79).applying(t, isY: true)
        ctx.setStrokeColor(UIColor.systemGray5.withAlphaComponent(0.7).cgColor)
        ctx.setLineWidth(2)
        ctx.move(to: CGPoint(x: 0, y: baselineY))
        ctx.addLine(to: CGPoint(x: bounds.width, y: baselineY))
        ctx.strokePath()

        for index in 0..<model.letterCount {
            let originX = model.originX(index)
            let done = model.isLetterComplete(index)
            let active = index == model.currentIndex && !model.isComplete

            for (s, pts) in model.letterStrokes[index].enumerated() {
                let view = pts.map { CGPoint(x: $0.x + originX, y: $0.y).applying(t) }
                guard view.count > 1 else { continue }

                // Letters not in hand are dimmed, so the eye goes to the one to
                // write without the rest of the word disappearing.
                ctx.setStrokeColor(UIColor.systemGray4.withAlphaComponent(active ? 0.55 : 0.22).cgColor)
                ctx.setLineWidth(width)
                ctx.setLineCap(.round)
                ctx.setLineJoin(.round)
                ctx.addPath(WriteEngine.path(from: view))
                ctx.strokePath()

                let progress: CGFloat = done ? 1 : (active && s == model.currentStroke ? model.currentProgress
                                                    : (active && s < model.currentStroke ? 1 : 0))
                guard progress > 0 else { continue }
                let inked = TraceInputView.prefix(of: view, fraction: progress)
                guard inked.count > 1 else { continue }
                ctx.setStrokeColor(tint.withAlphaComponent(done ? 0.85 : 1).cgColor)
                ctx.setLineWidth(width * 0.72)
                ctx.addPath(WriteEngine.path(from: inked))
                ctx.strokePath()
            }
        }

        if !model.isComplete, model.currentProgress == 0, let start = model.startPoint?.applying(t) {
            ctx.setFillColor(UIColor.systemRed.withAlphaComponent(0.9).cgColor)
            let r = width * 0.42
            ctx.fillEllipse(in: CGRect(x: start.x - r, y: start.y - r, width: r * 2, height: r * 2))
        }
    }
}

private extension CGFloat {
    /// Applies only the y part of a transform — for horizontal guides.
    func applying(_ t: CGAffineTransform, isY: Bool) -> CGFloat {
        CGPoint(x: 0, y: self).applying(t).y
    }
}
