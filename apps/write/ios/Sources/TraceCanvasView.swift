import SwiftUI
import TikoKit
import UIKit

/// The tracing surface.
///
/// A `UIView` rather than a SwiftUI gesture because SwiftUI's drag stream is
/// coarser than the hardware: `coalescedTouches` hands back every sample the
/// digitiser captured between frames, which on an Apple Pencil is up to 240 Hz.
/// Dropping those would make a fast stroke look like it skipped, and the engine
/// would rightly reject it.
struct TraceCanvasView: UIViewRepresentable {
    @ObservedObject var model: TraceViewModel
    let appColor: TikoAppColor

    func makeUIView(context: Context) -> TraceInputView {
        let view = TraceInputView()
        view.backgroundColor = .clear
        view.isMultipleTouchEnabled = false
        view.model = model
        return view
    }

    func updateUIView(_ uiView: TraceInputView, context: Context) {
        uiView.model = model
        uiView.setNeedsDisplay()
    }
}

final class TraceInputView: UIView {
    weak var modelBox: AnyObject?
    var model: TraceViewModel? {
        didSet { setNeedsDisplay() }
    }

    /// viewBox units to view points, preserving aspect and centring.
    private var transformToView: CGAffineTransform {
        guard let model else { return .identity }
        let box = model.viewBox
        guard box.width > 0, box.height > 0 else { return .identity }
        let scale = min(bounds.width / box.width, bounds.height / box.height)
        let dx = (bounds.width - box.width * scale) / 2
        let dy = (bounds.height - box.height * scale) / 2
        return CGAffineTransform(translationX: dx, y: dy).scaledBy(x: scale, y: scale)
    }

    private var transformToBox: CGAffineTransform { transformToView.inverted() }

    private func boxPoint(_ touch: UITouch) -> CGPoint {
        touch.location(in: self).applying(transformToBox)
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, let model else { return }
        model.begin(at: boxPoint(touch))
        setNeedsDisplay()
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, let model else { return }
        // Every sample the hardware captured, not just the one per frame that
        // `touchesMoved` is called with.
        let samples = event?.coalescedTouches(for: touch) ?? [touch]
        for sample in samples {
            model.move(to: boxPoint(sample), at: sample.timestamp)
        }
        setNeedsDisplay()
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        model?.lift()
        setNeedsDisplay()
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        model?.lift()
        setNeedsDisplay()
    }

    override func draw(_ rect: CGRect) {
        guard let ctx = UIGraphicsGetCurrentContext(), let model else { return }
        let t = transformToView

        for index in 0..<model.strokeCount {
            let points = model.strokePoints[index].map { $0.applying(t) }
            guard points.count > 1 else { continue }

            // The model underneath: what the child is following.
            ctx.setStrokeColor(UIColor.systemGray4.cgColor)
            ctx.setLineWidth(26)
            ctx.setLineCap(.round)
            ctx.setLineJoin(.round)
            ctx.addPath(WriteEngine.path(from: points))
            ctx.strokePath()
        }

        // Ink: drawn along the path's own centreline up to validated progress,
        // never under the finger. A wobbly hand still produces a clean letter,
        // while the engine keeps the real accuracy for Parent Mode.
        for index in 0..<model.strokeCount {
            let progress = model.completedStrokes[index] ?? (index == model.currentStroke ? model.currentProgress : 0)
            guard progress > 0 else { continue }
            let points = model.strokePoints[index].map { $0.applying(t) }
            let drawn = Self.prefix(of: points, fraction: progress)
            guard drawn.count > 1 else { continue }
            ctx.setStrokeColor(UIColor(appColorPrimary).cgColor)
            ctx.setLineWidth(18)
            ctx.setLineCap(.round)
            ctx.setLineJoin(.round)
            ctx.addPath(WriteEngine.path(from: drawn))
            ctx.strokePath()
        }

        // Where to start, and the points to travel through.
        if !model.isComplete, let start = model.startPoint?.applying(t), model.currentProgress == 0 {
            ctx.setFillColor(UIColor.systemRed.withAlphaComponent(0.85).cgColor)
            ctx.fillEllipse(in: CGRect(x: start.x - 11, y: start.y - 11, width: 22, height: 22))
        }
        if model.currentStroke < model.keyPoints.count {
            for (i, kp) in model.keyPoints[model.currentStroke].enumerated() {
                let p = kp.applying(t)
                let crossed = model.crossedKeyPoints.contains(i)
                ctx.setFillColor(
                    (crossed ? UIColor(appColorPrimary) : UIColor.systemGray2).withAlphaComponent(0.9).cgColor
                )
                let r: CGFloat = crossed ? 5 : 7
                ctx.fillEllipse(in: CGRect(x: p.x - r, y: p.y - r, width: r * 2, height: r * 2))
            }
        }
    }

    var appColorPrimary: Color = .green

    /// The first [fraction] of a polyline, by arc length rather than by index —
    /// index-based truncation would run fast through curves and slow through
    /// straights, which is exactly backwards.
    static func prefix(of points: [CGPoint], fraction: CGFloat) -> [CGPoint] {
        guard points.count > 1, fraction > 0 else { return [] }
        if fraction >= 1 { return points }

        var lengths: [CGFloat] = [0]
        var total: CGFloat = 0
        for i in 1..<points.count {
            total += hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
            lengths.append(total)
        }
        guard total > 0 else { return [] }

        let target = total * fraction
        var out: [CGPoint] = [points[0]]
        for i in 1..<points.count {
            if lengths[i] <= target {
                out.append(points[i])
            } else {
                let span = lengths[i] - lengths[i - 1]
                let t = span <= 0 ? 0 : (target - lengths[i - 1]) / span
                out.append(
                    CGPoint(
                        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
                        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t
                    )
                )
                break
            }
        }
        return out
    }
}
