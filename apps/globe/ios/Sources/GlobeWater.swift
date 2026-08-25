import Foundation
import simd

/// Rivers and lakes, decoded from `water.bin`. Separate from the country
/// geometry on purpose: different shape, different reader, and the country
/// format does not have to change to carry it.
struct GlobeWater: Sendable {
    struct Line: Sendable {
        let pointOffset: Int
        let pointCount: Int
    }

    static let formatVersion: UInt32 = 1
    private static let magic = "TIKOWTR1"
    private static let headerBytes = 28

    let rivers: [Line]
    /// lon/lat pairs, addressed by the river lines.
    let riverPoints: [SIMD2<Float>]
    /// lon/lat pairs of the lake fills.
    let lakeVertices: [SIMD2<Float>]
    let lakeIndices: [UInt32]

    init(data: Data) throws {
        guard data.count >= Self.headerBytes else { throw GlobeGeographyError.truncated }
        guard String(decoding: data[data.startIndex..<data.startIndex + 8], as: UTF8.self) == Self.magic else {
            throw GlobeGeographyError.badMagic
        }
        let header: (format: UInt32, lines: Int, points: Int, vertices: Int, indices: Int) = data.withUnsafeBytes { raw in
            (
                raw.loadUnaligned(fromByteOffset: 8, as: UInt32.self),
                Int(raw.loadUnaligned(fromByteOffset: 12, as: UInt32.self)),
                Int(raw.loadUnaligned(fromByteOffset: 16, as: UInt32.self)),
                Int(raw.loadUnaligned(fromByteOffset: 20, as: UInt32.self)),
                Int(raw.loadUnaligned(fromByteOffset: 24, as: UInt32.self))
            )
        }
        guard header.format == Self.formatVersion else {
            throw GlobeGeographyError.unsupportedFormat(header.format)
        }

        let linesOffset = Self.headerBytes
        let pointsOffset = linesOffset + header.lines * 8
        let verticesOffset = pointsOffset + header.points * 8
        let indicesOffset = verticesOffset + header.vertices * 8
        guard data.count >= indicesOffset + header.indices * 4 else { throw GlobeGeographyError.truncated }

        (rivers, riverPoints, lakeVertices, lakeIndices) = data.withUnsafeBytes { raw in
            var lines: [Line] = []
            lines.reserveCapacity(header.lines)
            for index in 0..<header.lines {
                let base = linesOffset + index * 8
                lines.append(Line(
                    pointOffset: Int(raw.loadUnaligned(fromByteOffset: base, as: UInt32.self)),
                    pointCount: Int(raw.loadUnaligned(fromByteOffset: base + 4, as: UInt32.self))
                ))
            }
            func pairs(at offset: Int, count: Int) -> [SIMD2<Float>] {
                Array(unsafeUninitializedCapacity: count) { buffer, initialized in
                    if count > 0 { memcpy(buffer.baseAddress!, raw.baseAddress! + offset, count * 8) }
                    initialized = count
                }
            }
            let indices = Array<UInt32>(unsafeUninitializedCapacity: header.indices) { buffer, initialized in
                if header.indices > 0 { memcpy(buffer.baseAddress!, raw.baseAddress! + indicesOffset, header.indices * 4) }
                initialized = header.indices
            }
            return (lines, pairs(at: pointsOffset, count: header.points), pairs(at: verticesOffset, count: header.vertices), indices)
        }
    }

    static func loadFromBundle(_ bundle: Bundle = .main) throws -> GlobeWater {
        guard let url = bundle.url(forResource: "water", withExtension: "bin", subdirectory: "generated")
            ?? bundle.url(forResource: "water", withExtension: "bin")
        else { throw GlobeGeographyError.missingAsset("water.bin") }
        return try GlobeWater(data: Data(contentsOf: url, options: .mappedIfSafe))
    }
}
