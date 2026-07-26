import SwiftUI

/// The Tiko wordmark, split into its four letters and the three strokes of the
/// sprout above the i, so each can animate on its own. The artwork is the same
/// vector as the `TikoLogo` asset; it lives here as path data because a
/// flattened image cannot be taken apart.
public enum TikoLogoGlyph: String, CaseIterable, Sendable {
    case t, i, k, o
    case leaf1, leaf2, leaf3

    public static var letters: [TikoLogoGlyph] { [.t, .i, .k, .o] }
    public static var sprout: [TikoLogoGlyph] { [.leaf1, .leaf2, .leaf3] }
    public static var drawingOrder: [TikoLogoGlyph] { letters + sprout }

    /// The logo's own coordinate space.
    public static let canvas = CGSize(width: 923.92, height: 575.6)

    var isSprout: Bool { Self.sprout.contains(self) }

    var pathData: String {
        switch self {
        case .t: "M276.59,268.89c0,0,46.66-7.44,54.36,1.53c19.16,22.33,2.08,64.16-24.7,71.14c-6.33,1.65-43.47,10.98-43.47,10.98s-3.19,16.97-6.39,47.75c-0.58,5.59-1.62,12.37-1.12,17.86c1.26,13.72,15.87,21.81,33.13,22.96c46.09,3.07,19.47,80.86-60.38,58.74c-60.39-16.74-49.76-54.99-43.57-103.05c1.22-9.47,3.68-39.15,3.68-39.15s-85.18,12.57-90.07,11.6c-32.9-6.55-27.97-49.41-6.23-65.76c9.05-6.81,109.02-27.29,109.02-27.29s10.42-64.66,12.05-70.64c8.92-32.63,61.93-37.21,69.28-0.33C282.98,209.31,276.59,268.89,276.59,268.89z"
        case .i: "M396.51,265.15c18.27-2.46,33.62,8.94,38.16,26.33c-4.55,44.93-10,90.3-16.74,135.01c-3.06,20.3-2.99,40.72-22.26,52.81c-10.55,6.62-27.19,9.45-38.44,3.61c-20.21-10.5-14.45-34.96-12.35-53.38c4.09-35.89,9.51-74.22,15-110.01C363.52,295.81,367.04,269.12,396.51,265.15z"
        case .k: "M539.9,183.54c-6.2,37.3-19.96,125.76-19.96,125.76s40.81-38.99,56.5-49.23c29.55-19.28,59.86,4.73,50.27,38.27c-6.44,22.5-70.24,63.18-70.24,63.18l47.1,36.52c23.72-4.7,45.23,17.03,35.56,41.01c-7.07,17.53-21.73,34.45-52.58,26.57c-27.51-7.03-74.93-56.05-74.93-56.05s-2.46,29.11-5.67,39c-7.3,22.46-36.76,37.2-57.09,21.74c-11.52-8.77-12.89-20.2-12.08-33.9c3.05-51.87,17.54-106.74,21.25-158.66c12.54-65.07,8.98-117.57,52.55-127.32C536.17,144.7,543.5,161.88,539.9,183.54z"
        case .o: "M824.58,270.85c-65.75-61.74-171.61,4.21-175.47,85.9c-4.2,88.77,92.75,122.16,157.94,71.97C852.93,393.41,869.64,313.16,824.58,270.85z M762.42,377.09c-26.79,12.07-51.03-12.57-36.45-38.45c9.6-17.05,38.37-24.85,50.79-6.97C787.42,347.02,778.74,369.73,762.42,377.09z"
        case .leaf1: "M381.43,73.95c20.95-8.54,24.59,16.01,30.11,75.36c5.89,63.38,2.72,82.93-17.02,86.6c-24.09,4.48-31.01-12.49-32.49-76.15C360.54,95.83,359.67,82.82,381.43,73.95z"
        case .leaf2: "M325.61,101.65c14.81-18.39,28.68-6.21,74.73,31.64c49.18,40.42,64.34,59.45,49.55,73.03c-18.42,16.93-30.7,13.24-76.97-30.5C326.45,131.88,310.88,119.95,325.61,101.65z"
        case .leaf3: "M450.49,115.02c13.78,19.17-1.66,29.3-50.39,63.61c-52.05,36.64-74.43,46.18-83.59,28.32c-11.42-22.27-4.59-33.11,49.89-66.07C421.12,107.77,436.77,95.94,450.49,115.02z"
        }
    }

    /// Centre of the glyph, so it scales in place.
    var anchor: UnitPoint {
        switch self {
        case .t: UnitPoint(x: 0.2246, y: 0.5999)
        case .i: UnitPoint(x: 0.4176, y: 0.6527)
        case .k: UnitPoint(x: 0.5871, y: 0.5479)
        case .o: UnitPoint(x: 0.8195, y: 0.5977)
        case .leaf1: UnitPoint(x: 0.4207, y: 0.2657)
        case .leaf2: UnitPoint(x: 0.4197, y: 0.2664)
        case .leaf3: UnitPoint(x: 0.4162, y: 0.279)
        }
    }
}

/// One glyph of the wordmark, scaled to fit while keeping the logo's aspect.
public struct TikoGlyphShape: Shape {
    private let glyph: TikoLogoGlyph

    public init(_ glyph: TikoLogoGlyph) {
        self.glyph = glyph
    }

    public func path(in rect: CGRect) -> Path {
        let canvas = TikoLogoGlyph.canvas
        let scale = min(rect.width / canvas.width, rect.height / canvas.height)
        let size = CGSize(width: canvas.width * scale, height: canvas.height * scale)
        let offset = CGPoint(x: rect.minX + (rect.width - size.width) / 2,
                             y: rect.minY + (rect.height - size.height) / 2)

        return TikoVectorPath.path(from: glyph.pathData)
            .applying(CGAffineTransform(scaleX: scale, y: scale))
            .applying(CGAffineTransform(translationX: offset.x, y: offset.y))
    }
}

/// The wordmark writing itself: t, i, k, o pop in from left to right, then the
/// sprout unfurls above the i.
public struct TikoAnimatedLogo: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let markColor: Color

    @State private var arrived: Set<TikoLogoGlyph> = []

    public init(markColor: Color = .white) {
        self.markColor = markColor
    }

    public var body: some View {
        ZStack {
            ForEach(TikoLogoGlyph.drawingOrder, id: \.self) { glyph in
                TikoGlyphShape(glyph)
                    .fill(markColor)
                    .scaleEffect(scale(for: glyph), anchor: glyph.anchor)
                    .opacity(arrived.contains(glyph) ? 1 : 0)
            }
        }
        .aspectRatio(TikoLogoGlyph.canvas.width / TikoLogoGlyph.canvas.height, contentMode: .fit)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Tiko")
        .task { await reveal() }
    }

    private func scale(for glyph: TikoLogoGlyph) -> CGFloat {
        guard arrived.contains(glyph) else { return glyph.isSprout ? 0.2 : 0.64 }
        return 1
    }

    private func reveal() async {
        guard !reduceMotion else {
            arrived = Set(TikoLogoGlyph.allCases)
            return
        }

        for glyph in TikoLogoGlyph.letters {
            withAnimation(.spring(response: 0.34, dampingFraction: 0.58)) {
                _ = arrived.insert(glyph)
            }
            try? await Task.sleep(for: .milliseconds(80))
        }

        try? await Task.sleep(for: .milliseconds(110))
        for glyph in TikoLogoGlyph.sprout {
            withAnimation(.spring(response: 0.30, dampingFraction: 0.48)) {
                _ = arrived.insert(glyph)
            }
            try? await Task.sleep(for: .milliseconds(70))
        }
    }
}

/// Just enough SVG path support for the wordmark: absolute/relative moves and
/// lines, cubic and smooth-cubic curves, and close. Deliberately not a general
/// SVG parser — it covers the commands this artwork uses and nothing more.
enum TikoVectorPath {
    private static let cache = Cache()

    static func path(from data: String) -> Path {
        if let cached = cache.value(for: data) { return cached }
        let built = build(from: data)
        cache.store(built, for: data)
        return built
    }

    private static func build(from data: String) -> Path {
        var path = Path()
        var scanner = Scanner(data: data)
        var current = CGPoint.zero
        var start = CGPoint.zero
        var lastControl: CGPoint?
        var command: Character?

        while let next = scanner.nextCommandOrNumber() {
            if case .command(let symbol) = next {
                command = symbol
                if symbol == "Z" || symbol == "z" {
                    path.closeSubpath()
                    current = start
                    lastControl = nil
                }
                continue
            }
            guard case .number(let first) = next, let command else { continue }

            switch command {
            case "M", "m":
                let x = command == "M" ? first : current.x + first
                let y = scanner.coordinate(relativeTo: current.y, absolute: command == "M")
                current = CGPoint(x: x, y: y)
                start = current
                path.move(to: current)
                lastControl = nil
            case "L", "l":
                let x = command == "L" ? first : current.x + first
                let y = scanner.coordinate(relativeTo: current.y, absolute: command == "L")
                current = CGPoint(x: x, y: y)
                path.addLine(to: current)
                lastControl = nil
            case "C", "c":
                let absolute = command == "C"
                let c1 = CGPoint(x: absolute ? first : current.x + first,
                                 y: scanner.coordinate(relativeTo: current.y, absolute: absolute))
                let c2 = scanner.point(relativeTo: current, absolute: absolute)
                let end = scanner.point(relativeTo: current, absolute: absolute)
                path.addCurve(to: end, control1: c1, control2: c2)
                lastControl = c2
                current = end
            case "S", "s":
                let absolute = command == "S"
                let c2 = CGPoint(x: absolute ? first : current.x + first,
                                 y: scanner.coordinate(relativeTo: current.y, absolute: absolute))
                let end = scanner.point(relativeTo: current, absolute: absolute)
                // A smooth curve mirrors the previous curve's second control point.
                let c1 = lastControl.map { CGPoint(x: 2 * current.x - $0.x, y: 2 * current.y - $0.y) } ?? current
                path.addCurve(to: end, control1: c1, control2: c2)
                lastControl = c2
                current = end
            default:
                break
            }
        }

        return path
    }

    private final class Cache: @unchecked Sendable {
        private var storage: [String: Path] = [:]
        private let lock = NSLock()

        func value(for key: String) -> Path? {
            lock.lock(); defer { lock.unlock() }
            return storage[key]
        }

        func store(_ path: Path, for key: String) {
            lock.lock(); defer { lock.unlock() }
            storage[key] = path
        }
    }

    private struct Scanner {
        enum Token {
            case command(Character)
            case number(CGFloat)
        }

        private let characters: [Character]
        private var index = 0

        init(data: String) {
            characters = Array(data)
        }

        mutating func nextCommandOrNumber() -> Token? {
            skipSeparators()
            guard index < characters.count else { return nil }

            let character = characters[index]
            if character.isLetter {
                index += 1
                return .command(character)
            }
            return readNumber().map { .number($0) }
        }

        mutating func coordinate(relativeTo base: CGFloat, absolute: Bool) -> CGFloat {
            skipSeparators()
            guard let value = readNumber() else { return base }
            return absolute ? value : base + value
        }

        mutating func point(relativeTo base: CGPoint, absolute: Bool) -> CGPoint {
            CGPoint(x: coordinate(relativeTo: base.x, absolute: absolute),
                    y: coordinate(relativeTo: base.y, absolute: absolute))
        }

        private mutating func skipSeparators() {
            while index < characters.count, characters[index] == "," || characters[index].isWhitespace {
                index += 1
            }
        }

        private mutating func readNumber() -> CGFloat? {
            skipSeparators()
            var text = ""
            if index < characters.count, characters[index] == "-" || characters[index] == "+" {
                text.append(characters[index])
                index += 1
            }
            while index < characters.count, characters[index].isNumber || characters[index] == "." {
                // ".5-.3" packs two numbers together; a second dot starts a new one.
                if characters[index] == ".", text.contains(".") { break }
                text.append(characters[index])
                index += 1
            }
            return Double(text).map { CGFloat($0) }
        }
    }
}

