import XCTest
@testable import TikoTimer
import TikoKit

final class TikoTimerTests: XCTestCase {
    func testAppColorsExist() {
        // Verify the timer palette is accessible
        let palette = TikoAppColor.timer.palette
        XCTAssertEqual(palette.label, "Timer")
    }
}
