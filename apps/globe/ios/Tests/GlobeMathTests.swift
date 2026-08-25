import XCTest
@testable import TikoGlobe

final class GlobeMathTests: XCTestCase {
    func testLatLonSurvivesTheRoundTripIncludingThePolesAndTheDateLine() {
        let points = [
            GeoPoint(lat: 0, lon: 0),
            GeoPoint(lat: 35.9, lon: 14.5),
            GeoPoint(lat: -33.9, lon: 151.2),
            GeoPoint(lat: 89.9, lon: 12),
            GeoPoint(lat: -89.9, lon: -60),
            GeoPoint(lat: 10, lon: 179.9),
            GeoPoint(lat: 10, lon: -179.9),
        ]
        for point in points {
            let round = GlobeMath.geoPoint(from: GlobeMath.unitVector(point))
            XCTAssertEqual(round.lat, point.lat, accuracy: 0.001, "\(point)")
            XCTAssertEqual(GlobeMath.longitudeDelta(round.lon, point.lon), 0, accuracy: 0.001, "\(point)")
        }
    }

    func testLongitudeDeltaTakesTheShortWayRound() {
        XCTAssertEqual(GlobeMath.longitudeDelta(179, -179), -2, accuracy: 0.0001)
        XCTAssertEqual(GlobeMath.longitudeDelta(-179, 179), 2, accuracy: 0.0001)
        XCTAssertEqual(GlobeMath.longitudeDelta(10, 350), 20, accuracy: 0.0001)
    }

    func testAngularDistanceMatchesKnownArcs() {
        XCTAssertEqual(GlobeMath.angularDistance(GeoPoint(lat: 0, lon: 0), GeoPoint(lat: 0, lon: 90)), 90, accuracy: 0.001)
        XCTAssertEqual(GlobeMath.angularDistance(GeoPoint(lat: 90, lon: 0), GeoPoint(lat: -90, lon: 0)), 180, accuracy: 0.001)
        XCTAssertEqual(GlobeMath.angularDistance(GeoPoint(lat: 10, lon: 179), GeoPoint(lat: 10, lon: -179)), 1.97, accuracy: 0.02)
    }

    func testARayDownTheAxisHitsTheFrontOfTheSphere() {
        let hit = GlobeMath.intersectUnitSphere(origin: SIMD3<Float>(0, 0, 3), direction: SIMD3<Float>(0, 0, -1))
        XCTAssertEqual(hit?.z ?? 0, 1, accuracy: 0.0001)
    }

    func testARayPastTheLimbMisses() {
        XCTAssertNil(GlobeMath.intersectUnitSphere(origin: SIMD3<Float>(0, 0, 3), direction: SIMD3<Float>(0, 1, -1)))
    }
}
