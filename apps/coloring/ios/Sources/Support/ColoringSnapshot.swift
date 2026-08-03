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
