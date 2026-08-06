import XCTest
import TikoCore
@testable import TikoWrite

final class TikoWriteTests: XCTestCase {

    /// The bridge's whole job: the geometry Swift draws is the geometry the
    /// engine validates against. If a polyline lost or reordered a point on the
    /// way across, the ink would sit beside the corridor and nothing would say so.
    func testPolylineRoundTripsFromTheEngine() throws {
        let glyph = try Self.firstShape()
        let flat = glyph.polyline(strokeIndex: 0)
        let points = WriteEngine.points(flat)

        XCTAssertEqual(points.count, Int(flat.count))
        XCTAssertGreaterThan(points.count, 2)
        for i in 0..<points.count {
            XCTAssertEqual(points[i].x, flat.x(index: Int32(i)), accuracy: 1e-9)
            XCTAssertEqual(points[i].y, flat.y(index: Int32(i)), accuracy: 1e-9)
        }
    }

    /// Every event the app can act on maps to a Swift case. An unmapped tag
    /// would fall through to `.ignored` and silently stop the ink.
    func testEveryEngineTagMapsToASwiftCase() throws {
        let glyph = try Self.firstShape()
        let session = StrokeCore.shared.createSession(
            glyph: glyph, settings: TraceSettings.companion.forgiving, attempt: 1
        )
        let start = WriteEngine.points(glyph.polyline(strokeIndex: 0))[0]

        // Beginning in the right place, and then far outside the corridor, are
        // two different tags — both must be named, neither may be `.ignored`.
        XCTAssertEqual(WriteEngine.tag(from: session.begin(x: start.x, y: start.y)), .beginOK)
        let strayed = WriteEngine.tag(from: session.onPoint(x: -900, y: -900, tMs: 16))
        XCTAssertNotEqual(strayed, .ignored)
        XCTAssertTrue(strayed.isSetback)
    }

    /// A curve, written here rather than read from the bundle: the bridge is
    /// what is under test, and a test that also depends on bundle lookup fails
    /// for two unrelated reasons.
    private static func firstShape() throws -> Glyph {
        let json = """
        {"packId":"test","packSchemaVersion":1,"packVersion":1,"style":"shape",
         "viewBox":[0,0,100,100],"groups":[{"id":"shapes","sortOrder":1}],
         "glyphs":[{"id":"arc","char":"arc","groupId":"shapes","sortOrder":1,
          "strokes":[{"d":"M20 80 C20 20 80 20 80 80"}]}]}
        """
        let pack = try StrokeCore.shared.loadPack(json: json)
        return try XCTUnwrap(pack.glyph(id: "arc"))
    }

    /// Arc-length truncation, which is what makes ink advance evenly through a
    /// curve. Index-based truncation would run fast through curves and slow
    /// through straights — exactly backwards.
    func testInkPrefixIsByArcLengthNotIndex() {
        // Three points, but the second segment is nine times the first.
        let points = [CGPoint(x: 0, y: 0), CGPoint(x: 1, y: 0), CGPoint(x: 10, y: 0)]
        let half = TraceInputView.prefix(of: points, fraction: 0.5)
        XCTAssertEqual(half.last?.x ?? 0, 5.0, accuracy: 0.001)
    }

    func testInkPrefixHandlesTheEnds() {
        let points = [CGPoint(x: 0, y: 0), CGPoint(x: 10, y: 0)]
        XCTAssertTrue(TraceInputView.prefix(of: points, fraction: 0).isEmpty)
        XCTAssertEqual(TraceInputView.prefix(of: points, fraction: 1).count, 2)
    }
}
