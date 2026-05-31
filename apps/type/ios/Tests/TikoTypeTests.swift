import XCTest
@testable import TikoType
import TikoKit

final class TikoTypeTests: XCTestCase {
    func testAppColorsExist() {
        let palette = TikoAppColor.type.palette
        XCTAssertEqual(palette.label, "Type")
    }
}
