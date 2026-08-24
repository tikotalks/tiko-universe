import XCTest
@testable import TikoGlobe

/// The bundled world: these run against the real generated assets, because a
/// globe with quietly broken geometry is exactly the failure a mock would hide.
final class GlobeGeographyTests: XCTestCase {
    private static var geography: GlobeGeography!

    override class func setUp() {
        super.setUp()
        geography = try? GlobeGeography.loadFromBundle(Bundle(for: GlobeGeographyTests.self))
        if geography == nil {
            geography = try? GlobeGeography.loadFromBundle()
        }
    }

    private var geography: GlobeGeography {
        get throws {
            try XCTUnwrap(Self.geography, "the app bundle should carry countries.json and geometry.bin")
        }
    }

    func testEveryCountryHasGeometryAndAUsableLabelPoint() throws {
        let geography = try geography
        XCTAssertGreaterThan(geography.countries.count, 200)
        for (index, record) in geography.countries.enumerated() {
            let shape = geography.geometry.countries[index]
            XCTAssertEqual(shape.id, record.id, "the two assets must stay in the same order")
            XCTAssertGreaterThan(shape.ringCount, 0, "\(record.id) has no outline")
            XCTAssertGreaterThan(shape.meshIndexCount, 0, "\(record.id) has no fill")
            XCTAssertTrue((-90...90).contains(record.labelPoint.lat), "\(record.id) label latitude")
            XCTAssertTrue((-180...180).contains(record.labelPoint.lon), "\(record.id) label longitude")
        }
    }

    func testTriangleIndicesStayInsideTheirCountry() throws {
        let geometry = try geography.geometry
        for country in geometry.countries {
            for offset in stride(from: 0, to: country.meshIndexCount, by: 97) {
                let index = geometry.meshIndices[country.meshIndexOffset + offset]
                XCTAssertLessThan(Int(index), country.meshVertexCount, "\(country.id) points past its vertices")
            }
        }
    }

    func testMaltaIsPresentWithItsFlagAndCapital() throws {
        let geography = try geography
        let malta = try XCTUnwrap(geography.countries.first { $0.id == "MLT" })
        XCTAssertEqual(malta.iso2, "MT")
        XCTAssertEqual(malta.capital?.name, "Valletta")
        XCTAssertEqual(GlobeCountryNaming.flag(for: malta), "🇲🇹")
        XCTAssertEqual(GlobeCountryNaming.name(for: malta, languageCode: "nl"), "Malta")
    }

    func testTheSystemsDisambiguatedNamesAreNotUsedOnTheGlobe() throws {
        let geography = try geography
        let china = try XCTUnwrap(geography.countries.first { $0.id == "CHN" })
        XCTAssertEqual(GlobeCountryNaming.name(for: china, languageCode: "en"), "China",
                       "the system calls this \"China mainland\", which is not what a child reads on a globe")
        if let hongKong = geography.countries.first(where: { $0.id == "HKG" }) {
            XCTAssertEqual(GlobeCountryNaming.name(for: hongKong, languageCode: "en"), "Hong Kong")
        }

        let congo = try XCTUnwrap(geography.countries.first { $0.id == "COD" })
        let congoName = GlobeCountryNaming.name(for: congo, languageCode: "en")
        XCTAssertFalse(congoName.contains(" - "), "got \(congoName)")
    }

    func testTerritoriesDoNotFlyTheirCountrysFlag() throws {
        let geography = try geography
        let territories = geography.countries.filter { $0.isoRole != .country }
        XCTAssertFalse(territories.isEmpty)
        for territory in territories {
            XCTAssertNil(GlobeCountryNaming.flag(for: territory), "\(territory.id) should not fly a flag")
        }
    }

    func testLandMeshSitsOnTheSphere() throws {
        let vertices = GlobeMeshBuilder.landVertices(for: try geography)
        XCTAssertFalse(vertices.isEmpty)
        for vertex in stride(from: 0, to: vertices.count, by: 501).map({ vertices[$0] }) {
            let length = sqrt(vertex.x * vertex.x + vertex.y * vertex.y + vertex.z * vertex.z)
            XCTAssertEqual(length, GlobeMeshBuilder.landRadius, accuracy: 0.0005)
        }
    }

    func testBorderRibbonsRunUnbrokenAroundEveryRing() throws {
        let geography = try geography
        let border = GlobeMeshBuilder.borderVertices(for: geography)
        let rings = geography.geometry.rings.filter { $0.pointCount >= 3 }
        let points = rings.reduce(0) { $0 + $1.pointCount }

        // Two vertices per outline point, not four per segment: the strip is
        // continuous, which is what keeps corners joined.
        XCTAssertEqual(border.vertices.count, points * 2)
        XCTAssertEqual(border.indices.count, points * 6, "two triangles per segment")
        for index in border.indices { XCTAssertLessThan(Int(index), border.vertices.count) }

        // Both sides of a point share its position and differ only in side.
        for offset in stride(from: 0, to: border.vertices.count - 1, by: 2002) {
            let left = border.vertices[offset]
            let right = border.vertices[offset + 1]
            XCTAssertEqual(left.x, right.x, accuracy: 0.0001)
            XCTAssertEqual(left.y, right.y, accuracy: 0.0001)
            XCTAssertEqual(left.side, -right.side)
        }
    }

    func testEveryCountryHasACutEdgeUnderneathIt() throws {
        let geography = try geography
        let faces = GlobeMeshBuilder.landVertices(for: geography)
        let walls = GlobeMeshBuilder.wallVertices(for: geography, faceCount: faces.count)
        XCTAssertFalse(walls.vertices.isEmpty)
        for index in stride(from: 0, to: walls.indices.count, by: 601) {
            let vertex = Int(walls.indices[index]) - faces.count
            XCTAssertTrue((0..<walls.vertices.count).contains(vertex), "wall indices address the wall vertices")
        }
        // Alternating top and base, so every quad spans the full thickness.
        let radii = walls.vertices.prefix(4).map { sqrt($0.x * $0.x + $0.y * $0.y + $0.z * $0.z) }
        XCTAssertEqual(radii[0], GlobeMeshBuilder.landRadius, accuracy: 0.0005)
        XCTAssertEqual(radii[1], GlobeMeshBuilder.landBaseRadius, accuracy: 0.0005)
        XCTAssertLessThan(GlobeMeshBuilder.oceanRadius, GlobeMeshBuilder.landBaseRadius, "the water sits under the slabs")
    }
}
