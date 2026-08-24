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
        // As far out as it goes *is* the whole Earth: once all of it is on
        // screen there is nothing further out to see.
        XCTAssertEqual(camera.distance, camera.maxDistance, accuracy: 0.0001)
        XCTAssertEqual(camera.distance, camera.earthDistance, accuracy: 0.0001)
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
        for degrees in [70.0, 60.0, 40.0, 20.0, 10.0, 5.0, 1.0, 0.3] {
            var camera = GlobeCamera()
            camera.setVisibleRadius(degrees)
            XCTAssertEqual(camera.visibleRadiusDegrees, degrees, accuracy: 0.01, "\(degrees)°")
        }

        // Asking for more than the screen can hold gives what it can hold.
        var camera = GlobeCamera()
        camera.setVisibleRadius(180)
        XCTAssertEqual(camera.visibleRadiusDegrees, camera.widestVisibleRadius, accuracy: 0.01)
    }

    func testTheWholeEarthMeansTheWholeEarthOnTheScreenItIsDrawnInto() {
        // A phone held upright has far less room above and below the globe than
        // a tablet does, and the camera has to sit further back for all of it
        // to fit between the toolbar and the mode bar.
        let phone = GlobeCamera.distanceFitting(viewSize: CGSize(width: 393, height: 852), coveredHeight: 210)
        let tablet = GlobeCamera.distanceFitting(viewSize: CGSize(width: 1032, height: 1376), coveredHeight: 210)
        XCTAssertGreaterThan(phone, tablet, "the narrower the screen, the further back the Earth sits")
        XCTAssertGreaterThanOrEqual(tablet, GlobeCamera.earthDistance - 0.0001)

        var camera = GlobeCamera()
        camera.fittingDistance = phone
        XCTAssertEqual(camera.earthDistance, phone, accuracy: 0.0001)
        // And the globe really does fit: its silhouette inside the usable half.
        let usable = (852.0 - 210) / 852
        let halfUsable = atan(tan(GlobeCamera.fieldOfViewDegrees / 2 * .pi / 180) * usable)
        XCTAssertLessThanOrEqual(asin(1 / camera.earthDistance), halfUsable)
    }

    /// The mode bar covers the bottom of the surface, so the globe is drawn
    /// above the middle of the view — and everything that maps a place to a
    /// point on screen, and back, has to agree about that.
    func testTheGlobeSitsAboveTheBarAndTapsStillLandWhereTheyLook() {
        let size = CGSize(width: 440, height: 956)
        let covered = 132.0
        var camera = GlobeCamera()
        camera.fittingDistance = GlobeCamera.distanceFitting(viewSize: size, coveredHeight: covered)
        camera.distance = camera.earthDistance
        camera.verticalShift = covered / Double(size.height)

        // The middle of the globe lands in the middle of the free strip, not in
        // the middle of the view.
        let centre = camera.viewPoint(for: camera.centre, viewSize: size)
        XCTAssertNotNil(centre)
        XCTAssertEqual(Double(centre!.y), (Double(size.height) - covered) / 2, accuracy: 1)

        // Its foot clears the bar: the lowest point of the silhouette sits above
        // where the bar begins.
        let radius = asin(1 / camera.distance)
        let halfFov = GlobeCamera.fieldOfViewDegrees / 2 * .pi / 180
        let halfHeight = Double(size.height) / 2
        let radiusPoints = tan(radius) / tan(halfFov) * halfHeight
        XCTAssertLessThanOrEqual(Double(centre!.y) + radiusPoints, Double(size.height) - covered + 1)
        XCTAssertGreaterThanOrEqual(Double(centre!.y) - radiusPoints, -1)

        // And a tap where a place is drawn finds that place again.
        for place in [GeoPoint(lat: 0, lon: 0), GeoPoint(lat: 40, lon: -20), GeoPoint(lat: -30, lon: 25)] {
            guard let point = camera.viewPoint(for: place, viewSize: size) else {
                return XCTFail("\(place) should be on screen")
            }
            guard let back = camera.geoPoint(atViewPoint: point, viewSize: size) else {
                return XCTFail("a tap on \(place) should hit the globe")
            }
            XCTAssertEqual(back.lat, place.lat, accuracy: 0.2)
            XCTAssertEqual(back.lon, place.lon, accuracy: 0.2)
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

    func testTheLiftLooksTheSameHoweverFarInTheChildHasZoomed() {
        var camera = GlobeCamera()
        var seen: [Double] = []
        for distance in [3.5, 2.0, 1.4, 1.05, 1.005] {
            camera.distance = distance
            let visibleArc = camera.visibleRadiusDegrees * .pi / 180
            // What the lift is worth as a share of the half-screen, which is
            // what the eye actually judges it by.
            seen.append(camera.selectionLiftDistance / visibleArc)
        }
        for share in seen {
            XCTAssertGreaterThan(share, 0.02, "a country still has to pop off the surface")
            XCTAssertLessThan(share, 0.2, "and never float above its own sea")
        }
    }
}
