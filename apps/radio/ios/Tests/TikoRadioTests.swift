import XCTest
@testable import TikoRadio
import TikoKit

final class TikoRadioTests: XCTestCase {
    func testAppColorsExist() {
        let palette = TikoAppColor.radio.palette
        XCTAssertEqual(palette.label, "Radio")
    }
}
