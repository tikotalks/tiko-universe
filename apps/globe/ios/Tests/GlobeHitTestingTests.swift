import XCTest
@testable import TikoGlobe

/// Tapping the globe: the part a child does hundreds of times per session.
final class GlobeHitTestingTests: XCTestCase {
    private static var geography: GlobeGeography!

    override class func setUp() {
        super.setUp()
        geography = try? GlobeGeography.loadFromBundle(Bundle(for: GlobeHitTestingTests.self))
        if geography == nil { geography = try? GlobeGeography.loadFromBundle() }
    }

    private func hitTester() throws -> GlobeHitTester {
        GlobeHitTester(geography: try XCTUnwrap(Self.geography))
    }

    private func country(at point: GeoPoint, tolerance: Double = 0) throws -> String? {
        let geography = try XCTUnwrap(Self.geography)
        let tester = try hitTester()
        let index = tolerance > 0
            ? tester.country(near: point, toleranceDegrees: tolerance)
            : tester.country(containing: point)
        return index.flatMap { geography.country(at: $0)?.id }
    }

    func testWellKnownPointsLandInTheRightCountry() throws {
        XCTAssertEqual(try country(at: GeoPoint(lat: 35.90, lon: 14.51)), "MLT")   // Valletta
        XCTAssertEqual(try country(at: GeoPoint(lat: 48.86, lon: 2.35)), "FRA")    // Paris
        XCTAssertEqual(try country(at: GeoPoint(lat: 35.68, lon: 139.69)), "JPN")  // Tokyo
        XCTAssertEqual(try country(at: GeoPoint(lat: -33.87, lon: 151.21)), "AUS") // Sydney
        XCTAssertEqual(try country(at: GeoPoint(lat: 64.13, lon: -21.90)), "ISL")  // Reykjavík
        XCTAssertEqual(try country(at: GeoPoint(lat: -1.29, lon: 36.82)), "KEN")   // Nairobi
    }

    func testCountriesStraddlingTheDateLineStayWhole() throws {
        // Chukotka reaches past 180° into negative longitudes, and Fiji sits on
        // both sides of it. A naive longitude test loses the far half of each.
        XCTAssertEqual(try country(at: GeoPoint(lat: 66.0, lon: 175.0)), "RUS")
        XCTAssertEqual(try country(at: GeoPoint(lat: 66.0, lon: -172.0)), "RUS")
        XCTAssertEqual(try country(at: GeoPoint(lat: -16.6, lon: 179.3)), "FJI")
        XCTAssertEqual(try country(at: GeoPoint(lat: -16.85, lon: -179.97)), "FJI")
    }

    func testOpenOceanSelectsNothing() throws {
        XCTAssertNil(try country(at: GeoPoint(lat: -30, lon: -140)))
    }

    func testALesothoSizedHoleBelongsToLesothoNotSouthAfrica() throws {
        XCTAssertEqual(try country(at: GeoPoint(lat: -29.31, lon: 27.48)), "LSO")
        XCTAssertEqual(try country(at: GeoPoint(lat: -26.20, lon: 28.04)), "ZAF")
    }

    func testAMissedTapNearASmallIslandStillFindsIt() throws {
        // A fingertip in the water north of Malta: not on the island, but
        // obviously meant for it — Sicily is further away than Malta is.
        let missedByAFingertip = GeoPoint(lat: 36.25, lon: 14.5)
        XCTAssertNil(try country(at: missedByAFingertip))
        XCTAssertEqual(try country(at: missedByAFingertip, tolerance: 0.5), "MLT")
    }

    func testForgivenessDoesNotInventASelectionInTheMiddleOfAnOcean() throws {
        XCTAssertNil(try country(at: GeoPoint(lat: -30, lon: -140), tolerance: 1.0))
    }
}
