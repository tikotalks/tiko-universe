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
    private(set) var lastResult: ColoringResultCode?

    init(page: ColoringPage) throws {
        let svg = try page.loadSVG()
        // Bundled artwork is validated by ColoringPageTests, so a throw here means the
        // bundle is broken rather than that a child did something unexpected.
        let engine = ColoringEngine.companion.fromSvg(documentId: page.id, svg: svg, title: page.title)
        self.engine = engine
        self.snapshot = try Self.decode(engine.snapshotJson())
    }

    var canUndo: Bool { snapshot.canUndo }
    var canRedo: Bool { snapshot.canRedo }

    func fill(x: Double, y: Double, colorHex: String) {
        apply(engine.fill(x: x, y: y, colorHex: colorHex))
    }

    func undo() { apply(engine.undo()) }
    func redo() { apply(engine.redo()) }

    private func apply(_ result: ColoringResult) {
        lastResult = result.code
        guard result.changed else { return }
        snapshot = (try? Self.decode(engine.snapshotJson())) ?? snapshot
    }

    private static func decode(_ json: String) throws -> ColoringSnapshot {
        try JSONDecoder().decode(ColoringSnapshot.self, from: Data(json.utf8))
    }

    /// Outlines for a library thumbnail. Returns nil rather than throwing so a broken
    /// page degrades to a blank tile instead of taking the library down with it.
    static func previewSnapshot(for page: ColoringPage) -> ColoringSnapshot? {
        guard let svg = try? page.loadSVG() else { return nil }
        let engine = ColoringEngine.companion.fromSvg(documentId: page.id, svg: svg, title: page.title)
        return try? decode(engine.snapshotJson())
    }
}
