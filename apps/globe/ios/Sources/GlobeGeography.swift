import Foundation
import simd

/// The broad climate a country sits in, which is what decides its colour.
enum GlobeClimate: String, Decodable, Sendable, CaseIterable {
    case polar
    case boreal
    case temperate
    case mediterranean
    case subtropical
    case tropical
    case desert
    case steppe
}

/// How a mapped unit relates to ISO 3166 — see `packages/geography/README.md`.
/// `country` owns its flag and can be named by the system; the others are named
/// by the source data.
enum GlobeIsoRole: String, Decodable, Sendable {
    case country
    case territory
    case unrecognized
}

enum GlobeSovereignty: String, Decodable, Sendable {
    case sovereign
    case country
    case dependency
    case disputed
    case indeterminate
}

struct GlobeCapital: Decodable, Sendable, Equatable {
    let name: String
    let lat: Double
    let lon: Double

    var point: GeoPoint { GeoPoint(lat: lat, lon: lon) }
}

/// One canonical country record, straight out of `countries.json`.
struct GlobeCountry: Decodable, Identifiable, Sendable, Equatable {
    let id: String
    let iso2: String?
    let iso3: String?
    let name: String
    let names: [String: String]
    let continent: String
    let region: String
    let mapColor: Int
    let climate: GlobeClimate
    let isoRole: GlobeIsoRole
    let sovereignty: GlobeSovereignty
    let labelPoint: GeoPoint
    /// Roughly how wide the country's largest landmass is, in degrees.
    let labelSpanDegrees: Double
    let bbox: [Double]
    let capital: GlobeCapital?
}

private struct GlobeCountryFile: Decodable {
    let schemaVersion: Int
    let countries: [GlobeCountry]
}

enum GlobeGeographyError: LocalizedError {
    case missingAsset(String)
    case badMagic
    case unsupportedFormat(UInt32)
    case truncated
    case mismatchedCountries(geometry: Int, records: Int)

    var errorDescription: String? {
        switch self {
        case .missingAsset(let name): "The bundled geography asset \(name) is missing."
        case .badMagic: "geometry.bin is not Tiko globe geometry."
        case .unsupportedFormat(let version): "geometry.bin is format \(version); this build reads format 1."
        case .truncated: "geometry.bin ends earlier than its table of contents says."
        case .mismatchedCountries(let geometry, let records):
            "geometry.bin holds \(geometry) countries and countries.json holds \(records)."
        }
    }
}

/// The decoded geometry blob. Outlines draw the borders and answer taps; the
/// mesh is the pre-triangulated fill. Both are lon/lat and get lifted onto the
/// sphere by whoever uses them.
struct GlobeGeometry: Sendable {
    struct Country: Sendable {
        let id: String
        let labelPoint: GeoPoint
        let minLon: Double
        let minLat: Double
        let maxLon: Double
        let maxLat: Double
        let ringOffset: Int
        let ringCount: Int
        let meshVertexOffset: Int
        let meshVertexCount: Int
        let meshIndexOffset: Int
        let meshIndexCount: Int
    }

    struct Ring: Sendable {
        let pointOffset: Int
        let pointCount: Int
        let isHole: Bool
    }

    static let formatVersion: UInt32 = 1
    private static let magic = "TIKOGEO1"
    private static let headerBytes = 32
    private static let countryRecordBytes = 52
    private static let ringRecordBytes = 12

    let countries: [Country]
    let rings: [Ring]
    /// lon/lat pairs; ring outlines.
    let outlinePoints: [SIMD2<Float>]
    /// lon/lat pairs; fill mesh.
    let meshVertices: [SIMD2<Float>]
    /// Country-local triangle indices; add the country's `meshVertexOffset`.
    let meshIndices: [UInt32]

    init(data: Data) throws {
        guard data.count >= Self.headerBytes else { throw GlobeGeographyError.truncated }
        let magic = String(decoding: data[data.startIndex..<data.startIndex + 8], as: UTF8.self)
        guard magic == Self.magic else { throw GlobeGeographyError.badMagic }

        let header: (format: UInt32, countries: Int, rings: Int, points: Int, vertices: Int, indices: Int) =
            data.withUnsafeBytes { raw in
                (
                    raw.loadUnaligned(fromByteOffset: 8, as: UInt32.self),
                    Int(raw.loadUnaligned(fromByteOffset: 12, as: UInt32.self)),
                    Int(raw.loadUnaligned(fromByteOffset: 16, as: UInt32.self)),
                    Int(raw.loadUnaligned(fromByteOffset: 20, as: UInt32.self)),
                    Int(raw.loadUnaligned(fromByteOffset: 24, as: UInt32.self)),
                    Int(raw.loadUnaligned(fromByteOffset: 28, as: UInt32.self))
                )
            }
        guard header.format == Self.formatVersion else {
            throw GlobeGeographyError.unsupportedFormat(header.format)
        }

        let countriesOffset = Self.headerBytes
        let ringsOffset = countriesOffset + header.countries * Self.countryRecordBytes
        let pointsOffset = ringsOffset + header.rings * Self.ringRecordBytes
        let verticesOffset = pointsOffset + header.points * 8
        let indicesOffset = verticesOffset + header.vertices * 8
        let end = indicesOffset + header.indices * 4
        guard data.count >= end else { throw GlobeGeographyError.truncated }

        (countries, rings, outlinePoints, meshVertices, meshIndices) = data.withUnsafeBytes { raw in
            var countries: [Country] = []
            countries.reserveCapacity(header.countries)
            for index in 0..<header.countries {
                let base = countriesOffset + index * Self.countryRecordBytes
                var identifier = ""
                for byte in 0..<4 {
                    let scalar = raw.loadUnaligned(fromByteOffset: base + byte, as: UInt8.self)
                    if scalar == 0 { break }
                    identifier.append(Character(UnicodeScalar(scalar)))
                }
                func float(_ slot: Int) -> Double {
                    Double(raw.loadUnaligned(fromByteOffset: base + 4 + slot * 4, as: Float.self))
                }
                func integer(_ slot: Int) -> Int {
                    Int(raw.loadUnaligned(fromByteOffset: base + 28 + slot * 4, as: UInt32.self))
                }
                countries.append(Country(
                    id: identifier,
                    labelPoint: GeoPoint(lat: float(1), lon: float(0)),
                    minLon: float(2),
                    minLat: float(3),
                    maxLon: float(4),
                    maxLat: float(5),
                    ringOffset: integer(0),
                    ringCount: integer(1),
                    meshVertexOffset: integer(2),
                    meshVertexCount: integer(3),
                    meshIndexOffset: integer(4),
                    meshIndexCount: integer(5)
                ))
            }

            var rings: [Ring] = []
            rings.reserveCapacity(header.rings)
            for index in 0..<header.rings {
                let base = ringsOffset + index * Self.ringRecordBytes
                rings.append(Ring(
                    pointOffset: Int(raw.loadUnaligned(fromByteOffset: base, as: UInt32.self)),
                    pointCount: Int(raw.loadUnaligned(fromByteOffset: base + 4, as: UInt32.self)),
                    isHole: raw.loadUnaligned(fromByteOffset: base + 8, as: UInt32.self) == 1
                ))
            }

            func floatPairs(at offset: Int, count: Int) -> [SIMD2<Float>] {
                Array(unsafeUninitializedCapacity: count) { buffer, initialized in
                    if count > 0 {
                        memcpy(buffer.baseAddress!, raw.baseAddress! + offset, count * 8)
                    }
                    initialized = count
                }
            }
            let points = floatPairs(at: pointsOffset, count: header.points)
            let vertices = floatPairs(at: verticesOffset, count: header.vertices)
            let indices = Array<UInt32>(unsafeUninitializedCapacity: header.indices) { buffer, initialized in
                if header.indices > 0 {
                    memcpy(buffer.baseAddress!, raw.baseAddress! + indicesOffset, header.indices * 4)
                }
                initialized = header.indices
            }
            return (countries, rings, points, vertices, indices)
        }
    }
}

/// Everything the app knows about the world, loaded once from the bundle.
struct GlobeGeography: Sendable {
    let countries: [GlobeCountry]
    let geometry: GlobeGeometry
    /// Record index by country id, so a geometry hit becomes a record without a scan.
    private let indexById: [String: Int]

    init(countries: [GlobeCountry], geometry: GlobeGeometry) throws {
        guard countries.count == geometry.countries.count else {
            throw GlobeGeographyError.mismatchedCountries(
                geometry: geometry.countries.count, records: countries.count
            )
        }
        self.countries = countries
        self.geometry = geometry
        indexById = Dictionary(uniqueKeysWithValues: countries.enumerated().map { ($0.element.id, $0.offset) })
    }

    func country(at index: Int) -> GlobeCountry? {
        countries.indices.contains(index) ? countries[index] : nil
    }

    func index(of id: String) -> Int? { indexById[id] }

    /// Loads the two committed assets. They are bundled, never fetched: Globe
    /// has to open on a working Earth in airplane mode from first launch.
    static func loadFromBundle(_ bundle: Bundle = .main) throws -> GlobeGeography {
        guard let countriesURL = url(named: "countries", extension: "json", in: bundle) else {
            throw GlobeGeographyError.missingAsset("countries.json")
        }
        guard let geometryURL = url(named: "geometry", extension: "bin", in: bundle) else {
            throw GlobeGeographyError.missingAsset("geometry.bin")
        }
        let file = try JSONDecoder().decode(GlobeCountryFile.self, from: Data(contentsOf: countriesURL))
        let geometry = try GlobeGeometry(data: Data(contentsOf: geometryURL, options: .mappedIfSafe))
        return try GlobeGeography(countries: file.countries, geometry: geometry)
    }

    private static func url(named name: String, extension ext: String, in bundle: Bundle) -> URL? {
        bundle.url(forResource: name, withExtension: ext, subdirectory: "generated")
            ?? bundle.url(forResource: name, withExtension: ext)
    }
}
