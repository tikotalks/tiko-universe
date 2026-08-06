import CoreGraphics
import Foundation
import SwiftUI

// The engine hands Swift a JSON snapshot rather than typed objects while the native
// adapter is still being proven — see `snapshotJson()` in ColoringCore. These mirror
// that shape. They are a UI-side read model, deliberately not a network contract.

struct ColoringSnapshot: Decodable {
    let document: ColoringDocument
    let canUndo: Bool
    let canRedo: Bool
}

struct ColoringDocument: Decodable {
    let canvas: ColoringCanvas
    let regions: [ColoringRegion]
    let strokes: [ColoringStrokeShape]

    /// Outlines are drawn from the authored paths, never the implicit backdrop —
    /// otherwise every page gets a box drawn round it.
    var outlinedRegions: [ColoringRegion] {
        regions.filter { $0.id != ColoringDocument.backdropRegionID }
    }

    static let backdropRegionID = "canvas"
}

struct ColoringStrokeShape: Decodable, Identifiable {
    let id: String
    let points: [ColoringStrokePoint]
    let color: ColoringColor
    let width: Double
    /// Set when the stroke should be clipped to one region — "stay inside the lines".
    let clippedRegionId: String?
}

struct ColoringStrokePoint: Decodable {
    let x: Double
    let y: Double
}

struct ColoringCanvas: Decodable {
    let width: Double
    let height: Double
}

struct ColoringRegion: Decodable, Identifiable {
    let id: String
    let path: ColoringRegionPath
    let fill: ColoringColor?
    let zIndex: Int
}

struct ColoringRegionPath: Decodable {
    let points: [ColoringPoint]
}

struct ColoringPoint: Decodable {
    let x: Double
    let y: Double
}

struct ColoringColor: Decodable {
    let hex: String
}

/// Maps between the document's coordinate space and the view, preserving aspect
/// ratio and centring the page. Import guarantees points lie inside the canvas.
struct CanvasTransform {
    let canvas: ColoringCanvas
    let viewSize: CGSize

    private var scale: CGFloat {
        min(viewSize.width / CGFloat(canvas.width), viewSize.height / CGFloat(canvas.height))
    }

    private var offset: CGPoint {
        CGPoint(
            x: (viewSize.width - CGFloat(canvas.width) * scale) / 2,
            y: (viewSize.height - CGFloat(canvas.height) * scale) / 2
        )
    }

    func path(for points: [ColoringPoint]) -> Path {
        var path = Path()
        guard let first = points.first else { return path }
        path.move(to: viewPoint(for: first))
        for point in points.dropFirst() {
            path.addLine(to: viewPoint(for: point))
        }
        path.closeSubpath()
        return path
    }

    /// An open path through the stroke's points, smoothed with quadratic segments so
    /// a fast drag reads as a curve rather than a run of straight lines.
    func strokePath(for points: [ColoringStrokePoint]) -> Path {
        var path = Path()
        let viewPoints = points.map { CGPoint(x: offset.x + CGFloat($0.x) * scale, y: offset.y + CGFloat($0.y) * scale) }
        guard let first = viewPoints.first else { return path }
        path.move(to: first)
        if viewPoints.count == 1 {
            // A tap with no movement — a dot needs a segment to be strokable at all.
            path.addLine(to: CGPoint(x: first.x + 0.01, y: first.y))
            return path
        }
        for index in 1 ..< viewPoints.count {
            let previous = viewPoints[index - 1]
            let current = viewPoints[index]
            let middle = CGPoint(x: (previous.x + current.x) / 2, y: (previous.y + current.y) / 2)
            path.addQuadCurve(to: middle, control: previous)
        }
        path.addLine(to: viewPoints[viewPoints.count - 1])
        return path
    }

    /// Brush widths are authored in canvas units so they mean the same thing on any
    /// screen size; scale converts to points at render time.
    func viewWidth(for canvasWidth: Double) -> CGFloat {
        max(1, CGFloat(canvasWidth) * scale)
    }

    func documentPoint(for point: CGPoint) -> (x: Double, y: Double) {
        (
            x: Double((point.x - offset.x) / scale),
            y: Double((point.y - offset.y) / scale)
        )
    }

    private func viewPoint(for point: ColoringPoint) -> CGPoint {
        CGPoint(
            x: offset.x + CGFloat(point.x) * scale,
            y: offset.y + CGFloat(point.y) * scale
        )
    }
}

extension Color {
    /// Parses the engine's canonical `#RRGGBB` / `#RRGGBBAA`. Unparseable values fall
    /// back to clear rather than trapping — the engine already rejects bad colours.
    init(coloringHex hex: String) {
        let clean = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard let value = UInt64(clean, radix: 16), clean.count == 6 || clean.count == 8 else {
            self = .clear
            return
        }

        let hasAlpha = clean.count == 8
        let red = Double((value >> (hasAlpha ? 24 : 16)) & 0xFF) / 255
        let green = Double((value >> (hasAlpha ? 16 : 8)) & 0xFF) / 255
        let blue = Double((value >> (hasAlpha ? 8 : 0)) & 0xFF) / 255
        let alpha = hasAlpha ? Double(value & 0xFF) / 255 : 1
        self.init(red: red, green: green, blue: blue, opacity: alpha)
    }
}
