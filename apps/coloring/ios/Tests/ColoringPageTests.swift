import Testing
@testable import TikoColoring

/// The engine throws on unimportable artwork by design — bad artwork is a pipeline
/// problem, not user input. That means a malformed bundled page would crash the app
/// on open, so every page has to be imported here instead.
struct ColoringPageTests {
    @Test("every bundled page is present in the app bundle")
    func artworkIsBundled() throws {
        for page in ColoringPage.bundled {
            let svg = try page.loadSVG(from: .main)
            #expect(!svg.isEmpty, "\(page.id) is empty")
        }
    }

    @Test("every bundled page imports and produces fillable regions")
    @MainActor
    func pagesImport() throws {
        for page in ColoringPage.bundled {
            let session = try ColoringSession(page: page)
            let document = session.snapshot.document

            #expect(document.canvas.width > 0, "\(page.id) has no canvas width")
            #expect(document.canvas.height > 0, "\(page.id) has no canvas height")
            #expect(!document.regions.isEmpty, "\(page.id) has no regions")

            let ids = document.regions.map(\.id)
            #expect(Set(ids).count == ids.count, "\(page.id) has duplicate region ids")

            for region in document.regions {
                #expect(region.path.points.count >= 3, "\(page.id)/\(region.id) is not a polygon")
            }
        }
    }

    @Test("filling the centre of a page changes it, and undo puts it back")
    @MainActor
    func fillAndUndo() throws {
        let session = try ColoringSession(page: ColoringPage.bundled[0])
        let canvas = session.snapshot.document.canvas

        session.fill(x: canvas.width / 2, y: canvas.height / 2, colorHex: "#2196F3")
        #expect(session.snapshot.document.regions.contains { $0.fill != nil })
        #expect(session.canUndo)

        session.undo()
        #expect(session.snapshot.document.regions.allSatisfy { $0.fill == nil })
    }

    @Test("a malformed colour is reported rather than crashing the app")
    @MainActor
    func malformedColourIsReported() throws {
        let session = try ColoringSession(page: ColoringPage.bundled[0])
        let canvas = session.snapshot.document.canvas

        session.fill(x: canvas.width / 2, y: canvas.height / 2, colorHex: "nonsense")

        #expect(session.snapshot.document.regions.allSatisfy { $0.fill == nil })
        #expect(!session.canUndo)
    }
}
