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
    let tint: Color

    func makeUIView(context: Context) -> TraceInputView {
        let view = TraceInputView()
        view.backgroundColor = .clear
        view.isMultipleTouchEnabled = false
        view.tint = UIColor(tint)
        view.model = model
        return view
    }

    func updateUIView(_ uiView: TraceInputView, context: Context) {
        uiView.model = model
        uiView.tint = UIColor(tint)
        uiView.syncToModel()
    }
}

final class TraceInputView: UIView {

    var model: TraceViewModel? { didSet { setNeedsDisplay() } }
    var tint: UIColor = .systemGreen

    /// A spark thrown off the pen tip. Deliberately short-lived and small: the
    /// point is to make the child's own movement feel alive, not to decorate the
    /// screen with something that competes with the letter.
    private struct Particle {
        var x: CGFloat
        var y: CGFloat
        var vx: CGFloat
        var vy: CGFloat
        var life: CGFloat      // 1 → 0
        var decay: CGFloat
        var size: CGFloat
        var hueShift: CGFloat
    }

    private var particles: [Particle] = []
    private var link: CADisplayLink?
    private var lastProgress: CGFloat = 0
    private var lastStroke: Int = 0
    private var lastCelebration = 0
    private var lastSetback = 0

    // MARK: - Geometry

    /// viewBox units to view points, preserving aspect and centring.
    private var toView: CGAffineTransform {
        guard let model else { return .identity }
        let box = model.viewBox
        guard box.width > 0, box.height > 0 else { return .identity }
        let inset: CGFloat = 24
        let w = bounds.width - inset * 2
        let h = bounds.height - inset * 2
        let scale = min(w / box.width, h / box.height)
        let dx = (bounds.width - box.width * scale) / 2
        let dy = (bounds.height - box.height * scale) / 2
        return CGAffineTransform(translationX: dx, y: dy).scaledBy(x: scale, y: scale)
    }

    private func boxPoint(_ touch: UITouch) -> CGPoint {
        touch.location(in: self).applying(toView.inverted())
    }

    // MARK: - Input

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, let model else { return }
        model.begin(at: boxPoint(touch))
        syncToModel()
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, let model else { return }
        // Every sample the hardware captured, not just the one per frame that
        // `touchesMoved` is called with.
        for sample in event?.coalescedTouches(for: touch) ?? [touch] {
            model.move(to: boxPoint(sample), at: sample.timestamp)
        }
        syncToModel()
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        model?.lift()
        syncToModel()
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        model?.lift()
        syncToModel()
    }

    // MARK: - Effects

    /// Reacts to whatever the engine just decided. Sparks follow the pen, a
    /// burst marks the finish, and a setback gets a small grey puff — visible
    /// enough to notice, quiet enough never to read as a telling-off.
    func syncToModel() {
        guard let model else { return }

        if model.currentStroke != lastStroke {
            lastStroke = model.currentStroke
            lastProgress = 0
        }
        if model.currentProgress > lastProgress, let tip = inkTip() {
            emitSparks(at: tip, count: 3)
            lastProgress = model.currentProgress
        } else if model.currentProgress < lastProgress {
            lastProgress = model.currentProgress
        }

        if model.celebrationTrigger != lastCelebration {
            lastCelebration = model.celebrationTrigger
            emitBurst()
        }
        if model.setbackTrigger != lastSetback {
            lastSetback = model.setbackTrigger
            if let tip = inkTip() { emitPuff(at: tip) }
        }

        startLinkIfNeeded()
        setNeedsDisplay()
    }

    /// The pen tip in view coordinates: the far end of the ink drawn so far.
    private func inkTip() -> CGPoint? {
        guard let model, model.currentStroke < model.strokePoints.count else { return nil }
        let pts = model.strokePoints[model.currentStroke].map { $0.applying(toView) }
        guard pts.count > 1 else { return nil }
        return Self.prefix(of: pts, fraction: max(model.currentProgress, 0.0001)).last
    }

    private func emitSparks(at point: CGPoint, count: Int) {
        for _ in 0..<count {
            let angle = CGFloat.random(in: 0..<(.pi * 2))
            let speed = CGFloat.random(in: 20...70)
            particles.append(
                Particle(
                    x: point.x, y: point.y,
                    vx: cos(angle) * speed, vy: sin(angle) * speed - 20,
                    life: 1, decay: CGFloat.random(in: 1.6...2.8),
                    size: CGFloat.random(in: 2.5...5.5),
                    hueShift: CGFloat.random(in: -0.06...0.06)
                )
            )
        }
        if particles.count > 320 { particles.removeFirst(particles.count - 320) }
    }

    /// The finish: a real burst from the last point of the letter.
    private func emitBurst() {
        guard let model else { return }
        let origin = inkTip() ?? CGPoint(x: bounds.midX, y: bounds.midY)
        _ = model
        for _ in 0..<140 {
            let angle = CGFloat.random(in: 0..<(.pi * 2))
            let speed = CGFloat.random(in: 90...340)
            particles.append(
                Particle(
                    x: origin.x, y: origin.y,
                    vx: cos(angle) * speed, vy: sin(angle) * speed,
                    life: 1, decay: CGFloat.random(in: 0.7...1.4),
                    size: CGFloat.random(in: 3...8),
                    hueShift: CGFloat.random(in: -0.12...0.12)
                )
            )
        }
    }

    private func emitPuff(at point: CGPoint) {
        for _ in 0..<8 {
            let angle = CGFloat.random(in: 0..<(.pi * 2))
            particles.append(
                Particle(
                    x: point.x, y: point.y,
                    vx: cos(angle) * 26, vy: sin(angle) * 26,
                    life: 0.7, decay: 2.6, size: 3, hueShift: -99  // -99 marks it grey
                )
            )
        }
    }

    private func startLinkIfNeeded() {
        guard link == nil, !particles.isEmpty else { return }
        let l = CADisplayLink(target: self, selector: #selector(step(_:)))
        l.add(to: .main, forMode: .common)
        link = l
    }

    @objc private func step(_ sender: CADisplayLink) {
        let dt = CGFloat(sender.duration)
        for i in particles.indices {
            particles[i].x += particles[i].vx * dt
            particles[i].y += particles[i].vy * dt
            particles[i].vy += 320 * dt                    // gravity, so sparks fall
            particles[i].vx *= 0.98
            particles[i].life -= particles[i].decay * dt
        }
        particles.removeAll { $0.life <= 0 }
        if particles.isEmpty {
            sender.invalidate()
            link = nil
        }
        setNeedsDisplay()
    }

    // MARK: - Drawing

    override func draw(_ rect: CGRect) {
        guard let ctx = UIGraphicsGetCurrentContext(), let model else { return }
        let t = toView
        let strokeWidth = max(14, min(bounds.width, bounds.height) * 0.075)

        // The model underneath: what the child is following.
        for index in 0..<model.strokeCount {
            let points = model.strokePoints[index].map { $0.applying(t) }
            guard points.count > 1 else { continue }
            ctx.setStrokeColor(UIColor.systemGray4.withAlphaComponent(0.55).cgColor)
            ctx.setLineWidth(strokeWidth)
            ctx.setLineCap(.round)
            ctx.setLineJoin(.round)
            ctx.addPath(WriteEngine.path(from: points))
            ctx.strokePath()
        }

        // Which way it goes. Arrows sit *inside* the model stroke and point along
        // the direction of travel, because "start here" is only half the
        // instruction — a child also has to know which way to set off.
        if !model.isComplete, model.currentStroke < model.strokePoints.count {
            drawDirectionArrows(ctx, points: model.strokePoints[model.currentStroke].map { $0.applying(t) },
                                width: strokeWidth)
        }

        // Ink along the path's own centreline up to validated progress, never
        // under the finger: a wobbly hand still produces a clean letter, and the
        // engine keeps the real accuracy for Parent Mode.
        for index in 0..<model.strokeCount {
            let progress = model.completedStrokes[index]
                ?? (index == model.currentStroke ? model.currentProgress : 0)
            guard progress > 0 else { continue }
            let points = model.strokePoints[index].map { $0.applying(t) }
            let drawn = Self.prefix(of: points, fraction: progress)
            guard drawn.count > 1 else { continue }
            ctx.setStrokeColor(tint.cgColor)
            ctx.setLineWidth(strokeWidth * 0.72)
            ctx.setLineCap(.round)
            ctx.setLineJoin(.round)
            ctx.addPath(WriteEngine.path(from: drawn))
            ctx.strokePath()
        }

        // Where to start, pulsing until the child sets off.
        if !model.isComplete, model.currentProgress == 0,
           let start = model.startPoint?.applying(t) {
            ctx.setFillColor(UIColor.systemRed.withAlphaComponent(0.9).cgColor)
            let r = strokeWidth * 0.42
            ctx.fillEllipse(in: CGRect(x: start.x - r, y: start.y - r, width: r * 2, height: r * 2))
        }

        // Key points: what the trace has to travel through.
        if !model.isComplete, model.currentStroke < model.keyPoints.count {
            for (i, kp) in model.keyPoints[model.currentStroke].enumerated() {
                let p = kp.applying(t)
                let crossed = model.crossedKeyPoints.contains(i)
                ctx.setFillColor((crossed ? tint : UIColor.systemGray2).withAlphaComponent(0.9).cgColor)
                let r: CGFloat = crossed ? strokeWidth * 0.14 : strokeWidth * 0.2
                ctx.fillEllipse(in: CGRect(x: p.x - r, y: p.y - r, width: r * 2, height: r * 2))
            }
        }

        drawParticles(ctx)
    }

    private func drawDirectionArrows(_ ctx: CGContext, points: [CGPoint], width: CGFloat) {
        guard points.count > 3 else { return }
        var lengths: [CGFloat] = [0]
        var total: CGFloat = 0
        for i in 1..<points.count {
            total += hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
            lengths.append(total)
        }
        guard total > 1 else { return }

        // One arrow roughly every 90pt, at least two per stroke.
        let count = max(2, Int(total / 90))
        let size = width * 0.3
        ctx.setStrokeColor(UIColor.systemGray.withAlphaComponent(0.85).cgColor)
        ctx.setLineWidth(max(2, width * 0.11))
        ctx.setLineCap(.round)
        ctx.setLineJoin(.round)

        for k in 0..<count {
            let target = total * (CGFloat(k) + 0.5) / CGFloat(count)
            guard let i = lengths.firstIndex(where: { $0 >= target }), i > 0 else { continue }
            let a = points[i - 1], b = points[i]
            let angle = atan2(b.y - a.y, b.x - a.x)
            let tip = b
            let left = CGPoint(x: tip.x - size * cos(angle - 0.55), y: tip.y - size * sin(angle - 0.55))
            let right = CGPoint(x: tip.x - size * cos(angle + 0.55), y: tip.y - size * sin(angle + 0.55))
            ctx.move(to: left)
            ctx.addLine(to: tip)
            ctx.addLine(to: right)
            ctx.strokePath()
        }
    }

    private func drawParticles(_ ctx: CGContext) {
        for p in particles {
            let alpha = max(0, min(1, p.life))
            let color: UIColor
            if p.hueShift <= -50 {
                color = UIColor.systemGray.withAlphaComponent(alpha * 0.5)
            } else {
                var h: CGFloat = 0, s: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
                tint.getHue(&h, saturation: &s, brightness: &b, alpha: &a)
                color = UIColor(
                    hue: (h + p.hueShift).truncatingRemainder(dividingBy: 1.0),
                    saturation: max(0.35, s), brightness: min(1, b + 0.15), alpha: alpha
                )
            }
            ctx.setFillColor(color.cgColor)
            let r = p.size * alpha
            ctx.fillEllipse(in: CGRect(x: p.x - r, y: p.y - r, width: r * 2, height: r * 2))
        }
    }

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
