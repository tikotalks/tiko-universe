import XCTest
@testable import TikoWrite

final class TikoWriteTests: XCTestCase {

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
