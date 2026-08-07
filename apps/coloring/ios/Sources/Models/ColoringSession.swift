import ColoringCore
import Foundation

/// Owns one `ColoringEngine` and republishes its snapshot to SwiftUI.
///
/// Every edit goes through the engine — this type deliberately holds no copy of the
/// document, so there is one source of truth and nothing to keep in sync.
@Observable
@MainActor
final class ColoringSession {
    private let engine: ColoringEngine

    private(set) var snapshot: ColoringSnapshot
    /// The stroke under the finger, before it is committed on lift.
    private(set) var activeStroke: ColoringStrokeShape?

    init(page: ColoringPage) throws {
        let svg = try page.loadSVG()
        // Bundled artwork is validated by ColoringPageTests, so a throw here means the
        // bundle is broken rather than that a child did something unexpected.
        let engine = ColoringEngine.companion.fromSvg(documentId: page.id, svg: svg, title: page.title)
        self.engine = engine
        self.snapshot = try Self.decode(ColoringSnapshot.self, from: engine.snapshotJson())
    }

    var canUndo: Bool { snapshot.canUndo }
    var canRedo: Bool { snapshot.canRedo }

    var hasArtwork: Bool {
        !snapshot.document.strokes.isEmpty || snapshot.document.regions.contains { $0.fill != nil }
    }

    func fill(x: Double, y: Double, colorHex: String) {
        reload(after: engine.fill(x: x, y: y, colorHex: colorHex))
    }

    func beginStroke(x: Double, y: Double, colorHex: String, width: Double, stayInsideLines: Bool) {
        _ = engine.beginStroke(
            x: x,
            y: y,
            colorHex: colorHex,
            width: width,
            tool: .crayon,
            stayInsideLines: stayInsideLines
        )
        refreshActiveStroke()
    }

    func extendStroke(x: Double, y: Double) {
        _ = engine.extendStroke(x: x, y: y, pressure: 1.0)
        refreshActiveStroke()
    }

    func endStroke() {
        let result = engine.endStroke()
        activeStroke = nil
        reload(after: result)
    }

    func undo() { reload(after: engine.undo()) }
    func redo() { reload(after: engine.redo()) }
    func clear() { reload(after: engine.clear()) }

    private func reload(after result: ColoringResult) {
        guard result.changed else { return }
        if let next = try? Self.decode(ColoringSnapshot.self, from: engine.snapshotJson()) {
            snapshot = next
        }
    }

    private func refreshActiveStroke() {
        guard let json = engine.activeStrokeJson() else {
            activeStroke = nil
            return
        }
        activeStroke = try? Self.decode(ColoringStrokeShape.self, from: json)
    }

    private static func decode<T: Decodable>(_ type: T.Type, from json: String) throws -> T {
        try JSONDecoder().decode(type, from: Data(json.utf8))
    }

    /// Outlines for a library thumbnail. Returns nil rather than throwing so a broken
    /// page degrades to a blank tile instead of taking the library down with it.
    static func previewSnapshot(for page: ColoringPage) -> ColoringSnapshot? {
        guard let svg = try? page.loadSVG() else { return nil }
        let engine = ColoringEngine.companion.fromSvg(documentId: page.id, svg: svg, title: page.title)
        return try? decode(ColoringSnapshot.self, from: engine.snapshotJson())
    }
}
