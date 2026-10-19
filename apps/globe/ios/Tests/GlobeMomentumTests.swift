import XCTest
@testable import TikoGlobe

/// Momentum, and the promise that Reduced Motion turns it off.
@MainActor
final class GlobeMomentumTests: XCTestCase {
    private let viewSize = CGSize(width: 390, height: 844)

    func testAFlickKeepsTheGlobeTurningAndThenStops() {
        let controller = GlobeController()
        controller.reduceMotion = false
        let start = controller.camera.yaw

        controller.beginInteraction()
        controller.drag(deltaX: 40, deltaY: 0, viewSize: viewSize)
        controller.endDrag(velocityX: 600, velocityY: 0, viewSize: viewSize)

        controller.advance(by: 1.0 / 60)
        let afterOneFrame = controller.camera.yaw
        XCTAssertNotEqual(afterOneFrame, start, "a flick should carry on for a moment")

        for _ in 0..<60 { controller.advance(by: 1.0 / 60) }
        let settled = controller.camera.yaw
        for _ in 0..<30 { controller.advance(by: 1.0 / 60) }
        XCTAssertEqual(controller.camera.yaw, settled, accuracy: 0.0001, "the globe stops within a second")
    }

    func testReducedMotionStopsTheGlobeWhenTheFingerLifts() {
        let controller = GlobeController()
        controller.reduceMotion = true

        controller.beginInteraction()
        controller.drag(deltaX: 40, deltaY: 0, viewSize: viewSize)
        let atLift = controller.camera.yaw
        controller.endDrag(velocityX: 900, velocityY: 0, viewSize: viewSize)

        for _ in 0..<30 { controller.advance(by: 1.0 / 60) }
        XCTAssertEqual(controller.camera.yaw, atLift, accuracy: 0.0001, "nothing keeps moving on its own")
    }

    func testReducedMotionMovesToACountryImmediatelyRatherThanFlyingThere() {
        let controller = GlobeController()
        controller.reduceMotion = true
        controller.showWholeEarth()
        XCTAssertEqual(controller.camera.distance, GlobeCamera.earthDistance, accuracy: 0.0001)
    }

    func testZoomingInAndOutFlipsTheWholeEarthFlag() {
        let controller = GlobeController()
        XCTAssertTrue(controller.isShowingWholeEarth)
        for _ in 0..<20 { controller.zoom(by: 1.5) }
        XCTAssertFalse(controller.isShowingWholeEarth)
        controller.reduceMotion = true
        controller.showWholeEarth()
        XCTAssertTrue(controller.isShowingWholeEarth)
    }
}
