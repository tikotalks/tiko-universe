import Foundation
import simd

/// A state or a province: the pieces of a country big enough that one colour
/// across the whole thing says nothing. Alaska is not Arizona.
struct GlobeSubdivision: Identifiable, Sendable {
    let id: String
    let name: String
    /// The country this belongs to, which is drawn as these instead of as itself.
    let parent: String
    let climate: GlobeClimate
    let labelPoint: GeoPoint
    let labelSpanDegrees: Double

    let ringOffset: Int
    let ringCount: Int
    let meshVertexOffset: Int
    let meshVertexCount: Int
    let meshIndexOffset: Int
    let meshIndexCount: Int
}

/// The geometry behind them, in the same shape the country geometry uses so the
/// mesh builder can treat both the same way.
struct GlobeSubdivisionGeometry: Sendable {
    struct Ring: Sendable {
        let pointOffset: Int
        let pointCount: Int
        let isHole: Bool
    }

    var items: [GlobeSubdivision] = []
    var rings: [Ring] = []
    var outlinePoints: [SIMD2<Float>] = []
    var meshVertices: [SIMD2<Float>] = []
    var meshIndices: [UInt32] = []

    /// The countries drawn as their pieces rather than as themselves.
    var parents: Set<String> { Set(items.map(\.parent)) }

    /// Missing is not fatal: the two countries are then drawn whole, as they
    /// were before this file existed.
    static func loadFromBundle(_ bundle: Bundle = .main) -> GlobeSubdivisionGeometry? {
        guard let url = bundle.url(forResource: "subdivisions", withExtension: "bin", subdirectory: "generated")
            ?? bundle.url(forResource: "subdivisions", withExtension: "bin"),
            let data = try? Data(contentsOf: url),
            var geometry = decode(data)
        else { return nil }
        geometry.nameThem(from: bundle)
        return geometry
    }

    /// The binary carries codes; the names live beside it in JSON, where a
    /// person can read them.
    private mutating func nameThem(from bundle: Bundle) {
        guard let url = bundle.url(forResource: "subdivisions", withExtension: "json", subdirectory: "generated")
            ?? bundle.url(forResource: "subdivisions", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let pack = try? JSONDecoder().decode(Manifest.self, from: data)
        else { return }
        let names = Dictionary(uniqueKeysWithValues: pack.items.map { ($0.id, $0.name) })
        items = items.map { item in
            guard let name = names[item.id] else { return item }
            return GlobeSubdivision(
                id: item.id, name: name, parent: item.parent, climate: item.climate,
                labelPoint: item.labelPoint, labelSpanDegrees: item.labelSpanDegrees,
                ringOffset: item.ringOffset, ringCount: item.ringCount,
                meshVertexOffset: item.meshVertexOffset, meshVertexCount: item.meshVertexCount,
                meshIndexOffset: item.meshIndexOffset, meshIndexCount: item.meshIndexCount
            )
        }
    }

    private struct Manifest: Decodable {
        struct Item: Decodable {
            let id: String
            let name: String
        }
        let items: [Item]
    }

    static func decode(_ data: Data) -> GlobeSubdivisionGeometry? {
        let header = 8 + 5 * 4
        guard data.count >= header, String(data: data[0..<8], encoding: .ascii) == "TIKOSUB1" else { return nil }

        func uint32(_ offset: Int) -> UInt32 {
            data.withUnsafeBytes { $0.loadUnaligned(fromByteOffset: offset, as: UInt32.self) }
        }
        func float(_ offset: Int) -> Float {
            data.withUnsafeBytes { $0.loadUnaligned(fromByteOffset: offset, as: Float.self) }
        }

        let itemCount = Int(uint32(12))
        let ringCount = Int(uint32(16))
        let vertexCount = Int(uint32(20))
        let indexCount = Int(uint32(24))

        var geometry = GlobeSubdivisionGeometry()
        geometry.items.reserveCapacity(itemCount)

        let recordBytes = 8 + 4 + 4 + 6 * 4 + 6 * 4
        var offset = header
        for _ in 0..<itemCount {
            let id = String(bytes: data[offset..<(offset + 8)].prefix { $0 != 0 }, encoding: .ascii) ?? ""
            let parent = String(bytes: data[(offset + 8)..<(offset + 12)].prefix { $0 != 0 }, encoding: .ascii) ?? ""
            let climate = GlobeClimate(index: Int(uint32(offset + 12)))
            let lon = Double(float(offset + 16))
            let lat = Double(float(offset + 20))
            let span = Double(float(offset + 24))
            geometry.items.append(GlobeSubdivision(
                id: id,
                name: id,
                parent: parent,
                climate: climate,
                labelPoint: GeoPoint(lat: lat, lon: lon),
                labelSpanDegrees: span,
                ringOffset: Int(uint32(offset + 40)),
                ringCount: Int(uint32(offset + 44)),
                meshVertexOffset: Int(uint32(offset + 48)),
                meshVertexCount: Int(uint32(offset + 52)),
                meshIndexOffset: Int(uint32(offset + 56)),
                meshIndexCount: Int(uint32(offset + 60))
            ))
            offset += recordBytes
        }

        geometry.rings.reserveCapacity(ringCount)
        for _ in 0..<ringCount {
            geometry.rings.append(Ring(
                pointOffset: Int(uint32(offset)),
                pointCount: Int(uint32(offset + 4)),
                isHole: uint32(offset + 8) == 1
            ))
            offset += 12
        }

        let pointCount = geometry.rings.reduce(0) { $0 + $1.pointCount }
        geometry.outlinePoints.reserveCapacity(pointCount)
        for _ in 0..<pointCount {
            geometry.outlinePoints.append(SIMD2<Float>(float(offset), float(offset + 4)))
            offset += 8
        }
        geometry.meshVertices.reserveCapacity(vertexCount)
        for _ in 0..<vertexCount {
            geometry.meshVertices.append(SIMD2<Float>(float(offset), float(offset + 4)))
            offset += 8
        }
        geometry.meshIndices.reserveCapacity(indexCount)
        for _ in 0..<indexCount {
            geometry.meshIndices.append(uint32(offset))
            offset += 4
        }
        return geometry
    }
}

extension GlobeClimate {
    /// The builder writes the index of this same list, so both sides agree
    /// without a table either of them could get wrong on its own.
    init(index: Int) {
        let all = GlobeClimate.allCases
        self = all.indices.contains(index) ? all[index] : .temperate
    }
}
