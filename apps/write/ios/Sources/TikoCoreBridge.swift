import CoreGraphics
import Foundation
import TikoCore

/// Swift-shaped access to the Kotlin engine.
///
/// The engine deliberately exposes flat primitives so nothing awkward crosses
/// the Objective-C bridge. This file is where that flatness turns back into
/// Swift types, so no view or view model ever handles a `KotlinInt` or walks a
/// `FlatPolyline` by index.
enum WriteEngine {

    /// What the engine just reported, as a Swift enum.
    enum Tag: Equatable {
        case beginOK
        case beginWrongPlace
        case progress
        case keyPoint(index: Int)
        case offPath
        case wrongDirection
        case liftedEarly
        case reset
        case strokeComplete
        case strokeOutOfOrder
        case glyphComplete
        case ignored

        /// True when the child did something the app must respond to gently —
        /// one soft tone, no voice, no red. Never a spoken correction.
        var isSetback: Bool {
            switch self {
            case .beginWrongPlace, .offPath, .wrongDirection, .liftedEarly, .reset, .strokeOutOfOrder:
                return true
            default:
                return false
            }
        }
    }

    struct Event {
        let tag: Tag
        let strokeIndex: Int
        /// Validated progress along the stroke, 0...1.
        let inkProgress: CGFloat
        /// Where the ink tip belongs — on the path, not under the finger.
        let inkPoint: CGPoint
    }

    static func tag(from event: StrokeEvent) -> Tag {
        switch event.tag {
        case StrokeTag.strokeBeginOk: return .beginOK
        case StrokeTag.strokeBeginWrongPlace: return .beginWrongPlace
        case StrokeTag.strokeProgress: return .progress
        case StrokeTag.strokeKeypoint: return .keyPoint(index: Int(event.keyPointCrossed))
        case StrokeTag.strokeOffPath: return .offPath
        case StrokeTag.strokeWrongDirection: return .wrongDirection
        case StrokeTag.strokeLiftedEarly: return .liftedEarly
        case StrokeTag.strokeReset: return .reset
        case StrokeTag.strokeComplete: return .strokeComplete
        case StrokeTag.glyphStrokeOutOfOrder: return .strokeOutOfOrder
        case StrokeTag.glyphComplete: return .glyphComplete
        default: return .ignored
        }
    }

    static func event(from raw: StrokeEvent) -> Event {
        Event(
            tag: tag(from: raw),
            strokeIndex: Int(raw.strokeIndex),
            inkProgress: CGFloat(raw.inkS),
            inkPoint: CGPoint(x: raw.inkX, y: raw.inkY)
        )
    }

    /// Copies a polyline out of the engine once, so rendering never crosses the
    /// bridge per frame.
    static func points(_ flat: FlatPolyline) -> [CGPoint] {
        let count = Int(flat.count)
        var out = [CGPoint]()
        out.reserveCapacity(count)
        for i in 0..<count {
            out.append(CGPoint(x: flat.x(index: Int32(i)), y: flat.y(index: Int32(i))))
        }
        return out
    }

    /// A display path built from the engine's own geometry. The line the child
    /// sees and the line they are measured against are the same data.
    static func path(from points: [CGPoint]) -> CGPath {
        let path = CGMutablePath()
        guard let first = points.first else { return path }
        path.move(to: first)
        for point in points.dropFirst() { path.addLine(to: point) }
        return path
    }
}
