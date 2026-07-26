import AVFoundation
import SwiftUI
import UIKit

// MARK: - Variants

/// Reward styles — pick one at random per success so celebrations stay
/// surprising. All render with SwiftUI `Canvas`, no third-party dependencies.
public enum TikoCelebrationVariant: CaseIterable, Sendable {
    case explosion
    case confettiRain
    case emojiRain
    case fireworks
    case stars
    case hearts
    case bubbles
}

/// How the hero element dances on a win — picked at random per success.
public enum TikoCardWinStyle: CaseIterable, Sendable {
    case pop
    case spin
    case bounce
    case wiggle

    public struct Phase: Equatable, Sendable {
        public var scale: Double
        public var rotation: Double
        public var y: Double

        public init(scale: Double = 1, rotation: Double = 0, y: Double = 0) {
            self.scale = scale
            self.rotation = rotation
            self.y = y
        }
    }

    public var phases: [Phase] {
        switch self {
        case .pop:
            return [.init(), .init(scale: 1.45), .init(scale: 0.9), .init(scale: 1.18), .init()]
        case .spin:
            return [.init(), .init(scale: 1.28, rotation: 200), .init(scale: 1.06, rotation: 360), .init(rotation: 360)]
        case .bounce:
            return [.init(), .init(scale: 1.08, y: -84), .init(scale: 0.92, y: 0), .init(scale: 1.04, y: -32), .init()]
        case .wiggle:
            return [.init(), .init(scale: 1.12, rotation: -12), .init(scale: 1.12, rotation: 12),
                    .init(scale: 1.08, rotation: -9), .init(scale: 1.08, rotation: 9), .init()]
        }
    }
}

// MARK: - Overlay

/// Full-screen particle celebration. With Reduce Motion, particles are
/// replaced by a gentle colour pulse.
public struct TikoCelebrationOverlay: View {
    let trigger: Int
    let variant: TikoCelebrationVariant
    /// The celebrated element's emoji — rains from the sky in `.emojiRain`.
    let emoji: String
    let appColor: TikoAppColor

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var startDate = Date()

    private let duration = 1.6

    public init(trigger: Int, variant: TikoCelebrationVariant, emoji: String, appColor: TikoAppColor) {
        self.trigger = trigger
        self.variant = variant
        self.emoji = emoji
        self.appColor = appColor
    }

    private struct Particle {
        let seedX: Double
        let angle: Double
        let speed: Double
        let size: Double
        let color: Color
        let spin: Double
        let delay: Double
        let emoji: Bool
    }

    private static let palettes: [[Color]] = [
        [Color(hex: 0x8b5cf6), Color(hex: 0xf472b6), Color(hex: 0xfacc15), Color(hex: 0x34d399)],
        [Color(hex: 0x60a5fa), Color(hex: 0xf87171), Color(hex: 0xfbbf24), Color(hex: 0xa78bfa)],
        [Color(hex: 0xf472b6), Color(hex: 0xfb923c), Color(hex: 0x4ade80), Color(hex: 0x38bdf8)],
    ]

    private var particles: [Particle] {
        var generator = TikoSeededGenerator(seed: UInt64(max(trigger, 1)) &* 7919)
        let palette = Self.palettes[trigger % Self.palettes.count]
        let count: Int
        switch variant {
        case .explosion: count = 54
        case .confettiRain, .emojiRain: count = 44
        case .fireworks: count = 60
        default: count = 34
        }
        return (0..<count).map { index in
            Particle(
                seedX: Double.random(in: 0...1, using: &generator),
                angle: Double.random(in: 0..<(2 * .pi), using: &generator),
                speed: Double.random(in: 130...460, using: &generator),
                size: Double.random(in: 7...18, using: &generator),
                color: palette[index % palette.count],
                spin: Double.random(in: -5...5, using: &generator),
                delay: particleDelay(index: index, generator: &generator),
                emoji: variant == .emojiRain && index % 3 != 2
            )
        }
    }

    private func particleDelay(index: Int, generator: inout TikoSeededGenerator) -> Double {
        switch variant {
        case .fireworks: return Double(index / 20) * 0.28
        case .confettiRain, .emojiRain: return Double.random(in: 0...0.5, using: &generator)
        default: return 0
        }
    }

    public var body: some View {
        Group {
            if reduceMotion {
                appColor.palette.primary.opacity(0.18)
                    .transition(.opacity)
                    .ignoresSafeArea()
            } else {
                TimelineView(.animation) { timeline in
                    Canvas { context, size in
                        let elapsed = timeline.date.timeIntervalSince(startDate)
                        guard elapsed < duration + 0.5 else { return }
                        let center = CGPoint(x: size.width / 2, y: size.height * 0.4)
                        let emojiSymbols = [
                            context.resolve(Text(emoji).font(.system(size: 30))),
                            context.resolve(Text(emoji).font(.system(size: 40))),
                            context.resolve(Text("✨").font(.system(size: 26))),
                        ]
                        if variant == .explosion {
                            drawShockwave(elapsed: elapsed, center: center, in: &context)
                        }
                        for (index, particle) in particles.enumerated() {
                            let t = elapsed - particle.delay
                            guard t > 0, t < duration else { continue }
                            let progress = t / duration
                            draw(particle, index: index, progress: progress, center: center,
                                 size: size, emojiSymbols: emojiSymbols, in: &context)
                        }
                    }
                }
                .ignoresSafeArea()
            }
        }
        .onAppear { startDate = Date() }
        .onChange(of: trigger) { _, _ in startDate = Date() }
        .accessibilityHidden(true)
    }

    // MARK: Drawing

    private func drawShockwave(elapsed: Double, center: CGPoint, in context: inout GraphicsContext) {
        let waveProgress = min(elapsed / 0.55, 1)
        guard waveProgress < 1 else { return }
        let radius = 40 + waveProgress * 260
        var ring = context
        ring.opacity = (1 - waveProgress) * 0.8
        ring.stroke(
            Path(ellipseIn: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)),
            with: .color(appColor.palette.primary),
            lineWidth: 10 * (1 - waveProgress) + 2
        )
    }

    private func draw(
        _ particle: Particle, index: Int, progress: Double, center: CGPoint,
        size: CGSize, emojiSymbols: [GraphicsContext.ResolvedText], in context: inout GraphicsContext
    ) {
        let fade = progress > 0.75 ? (1 - progress) / 0.25 : 1
        var layer = context
        layer.opacity = fade

        switch variant {
        case .explosion:
            let burst = 1 - pow(1 - progress, 3)
            let distance = particle.speed * 1.15 * burst
            let gravity = 330 * progress * progress
            let position = CGPoint(
                x: center.x + Foundation.cos(particle.angle) * distance,
                y: center.y + Foundation.sin(particle.angle) * distance + gravity
            )
            let side = particle.size * (1 - progress * 0.35)
            layer.translateBy(x: position.x, y: position.y)
            layer.rotate(by: .radians(particle.spin * progress * 3))
            layer.fill(
                Path(roundedRect: CGRect(x: -side / 2, y: -side / 2, width: side, height: side), cornerRadius: side * 0.28),
                with: .color(particle.color)
            )

        case .confettiRain:
            let x = particle.seedX * size.width + Foundation.sin(progress * 7 + particle.angle) * 26
            let y = -30 + (size.height + 60) * progress * (0.7 + particle.seedX * 0.4)
            let side = particle.size
            layer.translateBy(x: x, y: y)
            layer.rotate(by: .radians(particle.spin * progress * 4))
            layer.fill(
                Path(roundedRect: CGRect(x: -side / 2, y: -side / 3, width: side, height: side * 0.62), cornerRadius: 2),
                with: .color(particle.color)
            )

        case .emojiRain:
            let x = particle.seedX * size.width + Foundation.sin(progress * 5 + particle.angle) * 22
            let y = -40 + (size.height + 80) * progress * (0.65 + particle.seedX * 0.45)
            layer.translateBy(x: x, y: y)
            layer.rotate(by: .radians(particle.spin * progress * 1.6))
            if particle.emoji {
                let symbol = emojiSymbols[index % 2]
                layer.draw(symbol, at: .zero, anchor: .center)
            } else {
                layer.draw(emojiSymbols[2], at: .zero, anchor: .center)
            }

        case .fireworks:
            let burstCenter = CGPoint(
                x: size.width * (0.25 + particle.seedX * 0.5),
                y: size.height * (0.22 + Double(index / 20) * 0.12)
            )
            let burst = 1 - pow(1 - progress, 2.4)
            let distance = particle.speed * 0.55 * burst
            let position = CGPoint(
                x: burstCenter.x + Foundation.cos(particle.angle) * distance,
                y: burstCenter.y + Foundation.sin(particle.angle) * distance + 70 * progress * progress
            )
            let radius = particle.size * 0.38 * (1 - progress * 0.4)
            layer.fill(
                Path(ellipseIn: CGRect(x: position.x - radius, y: position.y - radius, width: radius * 2, height: radius * 2)),
                with: .color(particle.color)
            )

        case .stars:
            let distance = particle.speed * 0.8 * progress
            let position = CGPoint(
                x: center.x + Foundation.cos(particle.angle) * distance,
                y: center.y + Foundation.sin(particle.angle) * distance
            )
            layer.translateBy(x: position.x, y: position.y)
            layer.rotate(by: .radians(particle.spin * progress))
            layer.fill(Self.starPath(radius: particle.size * (1 - progress * 0.3)), with: .color(particle.color))

        case .hearts:
            let sway = Foundation.sin(progress * 6 + particle.angle) * 26
            let position = CGPoint(
                x: center.x + Foundation.cos(particle.angle) * 100 + sway,
                y: center.y - particle.speed * 0.95 * progress
            )
            layer.translateBy(x: position.x, y: position.y)
            layer.fill(Self.heartPath(size: particle.size * 1.35), with: .color(particle.color))

        case .bubbles:
            let wobble = Foundation.sin(progress * 8 + particle.angle * 3) * 18
            let position = CGPoint(
                x: center.x + Foundation.cos(particle.angle) * 140 + wobble,
                y: size.height * 0.78 - particle.speed * progress
            )
            let radius = particle.size * (0.7 + progress * 0.5)
            layer.stroke(
                Path(ellipseIn: CGRect(x: position.x - radius, y: position.y - radius, width: radius * 2, height: radius * 2)),
                with: .color(particle.color),
                lineWidth: 2.5
            )
        }
    }

    private static func starPath(radius: Double) -> Path {
        var path = Path()
        let points = 5
        for i in 0..<(points * 2) {
            let r = i.isMultiple(of: 2) ? radius : radius * 0.45
            let angle = Double(i) * .pi / Double(points) - .pi / 2
            let point = CGPoint(x: Foundation.cos(angle) * r, y: Foundation.sin(angle) * r)
            if i == 0 { path.move(to: point) } else { path.addLine(to: point) }
        }
        path.closeSubpath()
        return path
    }

    private static func heartPath(size: Double) -> Path {
        var path = Path()
        let s = size
        path.move(to: CGPoint(x: 0, y: s * 0.35))
        path.addCurve(to: CGPoint(x: -s / 2, y: -s * 0.25),
                      control1: CGPoint(x: -s * 0.6, y: s * 0.05),
                      control2: CGPoint(x: -s / 2, y: -s * 0.05))
        path.addArc(center: CGPoint(x: -s / 4, y: -s * 0.25), radius: s / 4,
                    startAngle: .degrees(180), endAngle: .degrees(0), clockwise: false)
        path.addArc(center: CGPoint(x: s / 4, y: -s * 0.25), radius: s / 4,
                    startAngle: .degrees(180), endAngle: .degrees(0), clockwise: false)
        path.addCurve(to: CGPoint(x: 0, y: s * 0.35),
                      control1: CGPoint(x: s / 2, y: -s * 0.05),
                      control2: CGPoint(x: s * 0.6, y: s * 0.05))
        path.closeSubpath()
        return path
    }
}

/// Deterministic RNG for stable particle layouts per burst.
public struct TikoSeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    public init(seed: UInt64) {
        state = seed &* 0x9E3779B97F4A7C15 &+ 1
    }

    public mutating func next() -> UInt64 {
        state ^= state << 13
        state ^= state >> 7
        state ^= state << 17
        return state
    }
}

// MARK: - Feedback sounds

/// Success and retry feedback. A win layers a random chime with a few tiny
/// pops sprinkled through the burst; retry is one soft, quiet acknowledgement
/// — never a buzzer. Missing files degrade to haptics alone.
@MainActor
public enum TikoFeedback {
    private static var players: [AVAudioPlayer] = []
    private static var popTask: Task<Void, Never>?
    private static let successSounds = ["tiko-success-1", "tiko-success-2", "tiko-success-3", "tiko-success-4", "tiko-success-5"]
    private static let popSounds = ["tiko-pop-1", "tiko-pop-2", "tiko-pop-3"]

    public static func playSuccess() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        play(name: successSounds.randomElement()!, volume: 0.7)

        popTask?.cancel()
        popTask = Task { @MainActor in
            for delay in [0.18, 0.34, 0.52, 0.74].shuffled().prefix(Int.random(in: 2...4)) {
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                guard !Task.isCancelled else { return }
                play(name: popSounds.randomElement()!, volume: 0.32)
                UIImpactFeedbackGenerator(style: .light).impactOccurred(intensity: 0.6)
            }
        }
    }

    /// A single tiny pop — for things that land one at a time, like the parts
    /// of a sum arriving on screen. Quieter than a win, never an event.
    public static func playPop() {
        play(name: popSounds.randomElement()!, volume: 0.24)
        UIImpactFeedbackGenerator(style: .light).impactOccurred(intensity: 0.45)
    }

    public static func playRetry() {
        popTask?.cancel()
        UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        play(name: "tiko-retry", volume: 0.28)
    }

    public static func stop() {
        popTask?.cancel()
        players.forEach { $0.stop() }
        players.removeAll()
    }

    private static func play(name: String, volume: Float) {
        guard let url = Bundle.module.url(forResource: name, withExtension: "wav"),
              let player = try? AVAudioPlayer(contentsOf: url) else { return }
        player.volume = volume
        player.play()
        players.append(player)
        players.removeAll { !$0.isPlaying && $0 !== player }
    }
}
