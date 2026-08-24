import XCTest
@testable import TikoGlobe

/// The camera contract: what the child can reach, and what they cannot.
final class GlobeCameraTests: XCTestCase {
    func testFocusPutsThePointInTheMiddleOfTheScreen() {
        var camera = GlobeCamera()
        for point in [GeoPoint(lat: 35.9, lon: 14.5), GeoPoint(lat: -33.9, lon: 151.2), GeoPoint(lat: 64.1, lon: -21.9)] {
            camera.focus(on: point)
            XCTAssertEqual(camera.centre.lat, point.lat, accuracy: 0.001)
            XCTAssertEqual(GlobeMath.longitudeDelta(camera.centre.lon, point.lon), 0, accuracy: 0.001)
        }
    }

    func testTheCentreOfTheScreenHitTestsBackToItself() {
        var camera = GlobeCamera()
        let size = CGSize(width: 390, height: 844)
        for point in [GeoPoint(lat: 0, lon: 0), GeoPoint(lat: 35.9, lon: 14.5), GeoPoint(lat: -41.3, lon: 174.8), GeoPoint(lat: 78, lon: -170)] {
            camera.focus(on: point)
            let centre = CGPoint(x: size.width / 2, y: size.height / 2)
            let resolved = camera.geoPoint(atViewPoint: centre, viewSize: size)
            XCTAssertNotNil(resolved)
            XCTAssertEqual(resolved!.lat, point.lat, accuracy: 0.01)
            XCTAssertEqual(GlobeMath.longitudeDelta(resolved!.lon, point.lon), 0, accuracy: 0.01)
        }
    }

    func testATapOutsideTheGlobeMissesRatherThanGuessing() {
        var camera = GlobeCamera()
        camera.distance = GlobeCamera.maxDistance
        let size = CGSize(width: 390, height: 844)
        XCTAssertNil(camera.geoPoint(atViewPoint: CGPoint(x: 4, y: 4), viewSize: size))
    }

    func testZoomStaysBetweenAWholeEarthAndACountry() {
        var camera = GlobeCamera()
        for _ in 0..<40 { camera.zoom(by: 2) }
        XCTAssertEqual(camera.distance, GlobeCamera.minDistance, accuracy: 0.0001)
        XCTAssertLessThan(camera.visibleRadiusDegrees, 3, "the deepest zoom is a region, never a street")
        for _ in 0..<40 { camera.zoom(by: 0.5) }
        XCTAssertEqual(camera.distance, GlobeCamera.maxDistance, accuracy: 0.0001)
        XCTAssertTrue(camera.isShowingWholeEarth)
        XCTAssertGreaterThan(camera.visibleRadiusDegrees, 70, "zoomed out, the planet is a whole ball again")
    }

    func testPitchStopsAtThePolesSoTheEarthNeverFlipsOver() {
        var camera = GlobeCamera()
        camera.apply(deltaYaw: 0, deltaPitch: 400)
        XCTAssertEqual(camera.pitch, 90, accuracy: 0.0001)
        camera.apply(deltaYaw: 0, deltaPitch: -800)
        XCTAssertEqual(camera.pitch, -90, accuracy: 0.0001)
    }

    func testDraggingRightTurnsTheGlobeWest() {
        var camera = GlobeCamera()
        camera.focus(on: GeoPoint(lat: 0, lon: 0))
        let before = camera.centre.lon
        camera.rotate(byX: 100, y: 0, viewSize: CGSize(width: 400, height: 800))
        XCTAssertLessThan(camera.centre.lon, before, "the land under the finger should follow it east")
    }

    func testZoomingInMakesTheSameDragTurnLess() {
        var far = GlobeCamera()
        far.distance = GlobeCamera.maxDistance
        var near = GlobeCamera()
        near.distance = GlobeCamera.minDistance
        let size = CGSize(width: 400, height: 800)
        XCTAssertLessThan(near.degreesPerPoint(viewSize: size), far.degreesPerPoint(viewSize: size) / 10)
    }

    func testPinchKeepsWhatIsUnderTheFingersUnderTheFingers() {
        let size = CGSize(width: 834, height: 1194)
        // Off-centre, where a naive zoom-to-the-middle slides the globe away.
        let finger = CGPoint(x: size.width * 0.32, y: size.height * 0.63)
        var camera = GlobeCamera()
        camera.focus(on: GeoPoint(lat: 20, lon: 10), distance: GlobeCamera.earthDistance)
        let anchor = camera.geoPoint(atViewPoint: finger, viewSize: size)
        XCTAssertNotNil(anchor, "the test finger should be on the globe")

        for _ in 0..<8 {
            camera.zoom(by: 1.25)
            camera.keep(anchor!, under: finger, viewSize: size)
        }

        let landedOn = camera.geoPoint(atViewPoint: finger, viewSize: size)
        XCTAssertNotNil(landedOn)
        XCTAssertEqual(landedOn!.lat, anchor!.lat, accuracy: 0.05)
        XCTAssertEqual(GlobeMath.longitudeDelta(landedOn!.lon, anchor!.lon), 0, accuracy: 0.05)
        XCTAssertLessThan(camera.distance, GlobeCamera.earthDistance, "and it actually zoomed in")
    }

    func testMovingTwoFingersCarriesTheGlobeWithThem() {
        let size = CGSize(width: 834, height: 1194)
        let start = CGPoint(x: size.width / 2, y: size.height / 2)
        let moved = CGPoint(x: start.x + 120, y: start.y - 60)
        var camera = GlobeCamera()
        let anchor = try? XCTUnwrap(camera.geoPoint(atViewPoint: start, viewSize: size))

        // A pinch that barely changes scale but travels: the anchor should
        // follow the fingers, which is what makes it read as dragging.
        camera.keep(anchor!, under: moved, viewSize: size)

        let landedOn = camera.geoPoint(atViewPoint: moved, viewSize: size)
        XCTAssertEqual(landedOn!.lat, anchor!.lat, accuracy: 0.05)
        XCTAssertEqual(GlobeMath.longitudeDelta(landedOn!.lon, anchor!.lon), 0, accuracy: 0.05)
    }

    func testTheZoomLadderStepsEvenlyInWhatTheChildSees() {
        var camera = GlobeCamera()
        camera.distance = GlobeCamera.maxDistance
        var radii: [Double] = [camera.visibleRadiusDegrees]

        // Walk the whole ladder, one button press at a time.
        while camera.distance > GlobeCamera.minDistance + 0.0001 {
            camera.zoom(by: 1.5)
            radii.append(camera.visibleRadiusDegrees)
            XCTAssertLessThan(radii.count, 40, "the ladder should not be endless")
        }

        XCTAssertGreaterThan(radii.count, 10, "a dozen-odd steps between the whole Earth and a city")
        // Every step but the last (which clamps) shrinks the view by the same
        // proportion — that is what makes zooming feel like one motion.
        for index in 1..<(radii.count - 1) {
            XCTAssertEqual(radii[index - 1] / radii[index], 1.5, accuracy: 0.06, "step \(index)")
        }
        XCTAssertLessThan(radii.last!, 0.2, "the last rung sits inside a small country")
    }

    func testVisibleRadiusRoundTripsThroughDistance() {
        for degrees in [75.0, 60.0, 40.0, 20.0, 10.0, 5.0, 1.0, 0.3] {
            var camera = GlobeCamera()
            camera.setVisibleRadius(degrees)
            XCTAssertEqual(camera.visibleRadiusDegrees, degrees, accuracy: 0.01, "\(degrees)°")
        }
    }

    func testHitToleranceGrowsWithTheVisibleArea() {
        var far = GlobeCamera()
        far.distance = GlobeCamera.maxDistance
        var near = GlobeCamera()
        near.distance = GlobeCamera.minDistance
        let size = CGSize(width: 390, height: 844)
        XCTAssertGreaterThan(far.hitToleranceDegrees(viewSize: size), near.hitToleranceDegrees(viewSize: size))
        XCTAssertLessThan(near.hitToleranceDegrees(viewSize: size), 0.5)
    }
}
