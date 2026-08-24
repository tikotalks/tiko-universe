import Foundation
import Metal
import MetalKit
import simd

/// Vertex layouts, mirrored exactly by `GlobeShaders.metal`. Positions are three
/// loose floats rather than a `SIMD3` so the Swift stride matches Metal's
/// `packed_float3`.
struct GlobeLandVertex {
    var x: Float
    var y: Float
    var z: Float
    /// Which country this triangle belongs to; the shader compares it with the
    /// selected country to decide the highlight.
    var country: Float
    /// Index into the per-country colour table.
    var color: Float
    /// 1 for the face a child looks down on, less for the cut edge around it.
    var shade: Float
    /// Which way this bit of surface faces. The top of a country faces straight
    /// out of the globe; the cut edge around it faces sideways, out to sea,
    /// which is what makes a country read as a slab of clay rather than a decal.
    var nx: Float
    var ny: Float
    var nz: Float
}

struct GlobePositionVertex {
    var x: Float
    var y: Float
    var z: Float
}

/// Borders are ribbons rather than lines: `perpendicular` is the direction to
/// push the vertex sideways along the surface, `side` which way, and `country`
/// lets selection lift the outline with the fill it belongs to.
struct GlobeBorderVertex {
    var x: Float
    var y: Float
    var z: Float
    var px: Float
    var py: Float
    var pz: Float
    var side: Float
    var country: Float
}

struct GlobeUniforms {
    var viewProjection: simd_float4x4
    var lightDirection: SIMD3<Float>
    var selectedCountry: Int32
    var horizonCosine: Float
    var selectionLift: Float
    var selectionLiftDistance: Float
    var borderHalfWidth: Float
    var cameraDirection: SIMD3<Float>
    var oceanColor: SIMD4<Float>
    var atmosphereColor: SIMD4<Float>
    var borderColor: SIMD4<Float>
    var highlightColor: SIMD4<Float>
    var selectedBorderColor: SIMD4<Float>
    /// The mark a lifted country leaves behind, and the radius it sits at —
    /// above the water, below the slabs still lying flat around it.
    var shadowColor: SIMD4<Float>
    var shadowRadius: Float
    /// Where the waterline of a country's slab sits this frame. A fixed slice
    /// of the globe is a cliff once a child is standing on one island.
    var slabBaseRadius: Float
    /// What to scale the water sphere by, so the sea always meets the foot of
    /// that cliff rather than leaving a gap you can see through.
    var surfaceScale: Float
    /// The sea over the deepest trench, and whether there is a depth image to
    /// read at all.
    var deepOceanColor: SIMD4<Float>
    var hasBathymetry: Int32
    /// Draw the colour as it is, with no light on it. A lake has to match the
    /// river running into it exactly, and the river is drawn flat.
    var flatShading: Int32
}

/// The colours of the Earth, handed in by SwiftUI so light and dark mode stay a
/// view concern. The palette is Natural Earth's nine-colour map index, so
/// neighbouring countries never share a tint.
struct GlobeAppearance: Equatable {
    var background: SIMD4<Float>
    var ocean: SIMD4<Float>
    var atmosphere: SIMD4<Float>
    /// Outline weight in points. Zero draws no outline at all: the cut edge
    /// around each slab already separates one country from the next.
    var borderWidth: Float
    /// Rivers are drawn in their own colour and weight, always.
    var riverWidth: Float
    var river: SIMD4<Float>
    /// And a lake matches the river that feeds it. It borrowed the sea's colour
    /// until the sea's colour became the pale one a continental shelf wants.
    var lake: SIMD4<Float>
    var border: SIMD4<Float>
    var selectedBorder: SIMD4<Float>
    var highlight: SIMD4<Float>
    /// What a country leaves on the sea floor while it is lifted. The alpha is
    /// how dark it goes once the lift has finished.
    var shadow: SIMD4<Float>
    /// The colour over the deepest water. `ocean` is the shallow end of the
    /// same scale, so a shelf is pale and a trench is nearly navy.
    var deepOcean: SIMD4<Float>
    /// Whether this is the dark appearance — the land table is built from it.
    var isDark: Bool
}

/// Turns the bundled lon/lat geometry into what the GPU draws. Kept apart from
/// the renderer so the shapes can be checked without a device.
enum GlobeMeshBuilder {
    /// Land and its borders share one radius. Lifting the border even slightly
    /// off the fill makes the two slide apart as soon as the globe turns away
    /// from the camera — the depth buffer's bias handles the overlap instead.
    static let landRadius: Float = 1.0
    static let borderRadius: Float = 1.0
    /// Countries are slabs, not decals: the cut edge between this and the top
    /// face is what gives them thickness when the globe turns. Thick enough to
    /// catch the light down its side — a thinner slab reads as a printed line.
    static let landBaseRadius: Float = 0.9845
    static let oceanRadius: Float = 0.9838
    /// The shadow lies on the water, just clear of it.
    static let shadowRadius: Float = 0.9841
    /// The shadow a country casts into its own coastline. The side of the slab
    /// is lit properly now, so this is contact shading and nothing more.
    static let edgeShade: Float = 0.66
    /// And the light the coastline itself catches, the way a bevelled edge does.
    static let coastShade: Float = 1.06

    /// One drawable piece of land: a country, or one state of a country drawn
    /// state by state. Selection still answers to the country — tapping Texas
    /// lifts the United States — while the colour answers to the piece.
    struct Unit {
        let countryIndex: Int
        let colorIndex: Int
        let ringOffset: Int
        let ringCount: Int
        let meshVertexOffset: Int
        let meshVertexCount: Int
        let meshIndexOffset: Int
        let meshIndexCount: Int
        /// Where its rings and mesh live: the country file, or the state file.
        let isSubdivision: Bool
    }

    /// What the globe actually draws, in order. A country whose states are on
    /// file is drawn as those instead of as itself, so the two are never laid
    /// on top of each other.
    static func units(for geography: GlobeGeography, subdivisions: GlobeSubdivisionGeometry?) -> [Unit] {
        let indexByID = Dictionary(
            uniqueKeysWithValues: geography.countries.enumerated().map { ($0.element.id, $0.offset) }
        )
        let drawnAsParts = subdivisions?.parents ?? []
        var units: [Unit] = []

        for (index, country) in geography.geometry.countries.enumerated() where !drawnAsParts.contains(country.id) {
            units.append(Unit(
                countryIndex: index,
                colorIndex: index,
                ringOffset: country.ringOffset,
                ringCount: country.ringCount,
                meshVertexOffset: country.meshVertexOffset,
                meshVertexCount: country.meshVertexCount,
                meshIndexOffset: country.meshIndexOffset,
                meshIndexCount: country.meshIndexCount,
                isSubdivision: false
            ))
        }
        // Grouped by parent, so a country's own triangles stay contiguous and
        // the shadow it casts when lifted is still one range.
        if let subdivisions {
            for parent in drawnAsParts.sorted() {
                for (offset, item) in subdivisions.items.enumerated() where item.parent == parent {
                    units.append(Unit(
                        countryIndex: indexByID[parent] ?? 0,
                        colorIndex: geography.countries.count + offset,
                        ringOffset: item.ringOffset,
                        ringCount: item.ringCount,
                        meshVertexOffset: item.meshVertexOffset,
                        meshVertexCount: item.meshVertexCount,
                        meshIndexOffset: item.meshIndexOffset,
                        meshIndexCount: item.meshIndexCount,
                        isSubdivision: true
                    ))
                }
            }
        }
        return units
    }

    /// The top faces, in the order the units are drawn, so the fill indices
    /// still address them.
    static func landVertices(
        for geography: GlobeGeography,
        subdivisions: GlobeSubdivisionGeometry?,
        units: [Unit]
    ) -> [GlobeLandVertex] {
        var vertices: [GlobeLandVertex] = []
        vertices.reserveCapacity(geography.geometry.meshVertices.count + (subdivisions?.meshVertices.count ?? 0))
        for unit in units {
            let source = unit.isSubdivision ? subdivisions!.meshVertices : geography.geometry.meshVertices
            for offset in 0..<unit.meshVertexCount {
                let point = source[unit.meshVertexOffset + offset]
                let position = GlobeMath.unitVector(lat: Double(point.y), lon: Double(point.x)) * landRadius
                let normal = simd_normalize(position)
                vertices.append(GlobeLandVertex(
                    x: position.x, y: position.y, z: position.z,
                    country: Float(unit.countryIndex), color: Float(unit.colorIndex), shade: 1,
                    nx: normal.x, ny: normal.y, nz: normal.z
                ))
            }
        }
        return vertices
    }

    static func landIndices(
        for geography: GlobeGeography,
        subdivisions: GlobeSubdivisionGeometry?,
        units: [Unit]
    ) -> [UInt32] {
        var indices: [UInt32] = []
        indices.reserveCapacity(geography.geometry.meshIndices.count + (subdivisions?.meshIndices.count ?? 0))
        var base: UInt32 = 0
        for unit in units {
            let source = unit.isSubdivision ? subdivisions!.meshIndices : geography.geometry.meshIndices
            for offset in 0..<unit.meshIndexCount {
                indices.append(base + source[unit.meshIndexOffset + offset])
            }
            base += UInt32(unit.meshVertexCount)
        }
        return indices
    }

    /// Where each country's own triangles sit in that list, so one country can
    /// be drawn on its own — which is what casting its shadow needs. A country
    /// drawn as its states owns all of their triangles together.
    static func landIndexRanges(for geography: GlobeGeography, units: [Unit]) -> [Range<Int>] {
        var ranges = Array(repeating: 0..<0, count: geography.countries.count)
        var start = 0
        for unit in units {
            let end = start + unit.meshIndexCount
            let existing = ranges[unit.countryIndex]
            ranges[unit.countryIndex] = existing.isEmpty ? start..<end : existing.lowerBound..<end
            start = end
        }
        return ranges
    }

    /// The cut edge around every country: one quad per outline segment, dropped
    /// from the top face to the base. Appended to the same buffer as the faces,
    /// with its own indices, so the whole planet is still one draw.
    static func wallVertices(
        for geography: GlobeGeography,
        subdivisions: GlobeSubdivisionGeometry?,
        units: [Unit],
        faceCount: Int
    ) -> (vertices: [GlobeLandVertex], indices: [UInt32]) {
        let geometry = geography.geometry
        var vertices: [GlobeLandVertex] = []
        var indices: [UInt32] = []
        vertices.reserveCapacity(geometry.outlinePoints.count * 4)
        indices.reserveCapacity(geometry.outlinePoints.count * 6)

        for unit in units {
            let colorIndex = Float(unit.colorIndex)
            let index = unit.countryIndex
            for ringIndex in unit.ringOffset..<(unit.ringOffset + unit.ringCount) {
                // Two files, one shape: only the offsets and the count matter
                // here, so they are read out rather than passed around.
                let pointOffset: Int
                let pointCount: Int
                let outline: [SIMD2<Float>]
                if unit.isSubdivision, let subdivisions {
                    let ring = subdivisions.rings[ringIndex]
                    pointOffset = ring.pointOffset
                    pointCount = ring.pointCount
                    outline = subdivisions.outlinePoints
                } else {
                    let ring = geometry.rings[ringIndex]
                    pointOffset = ring.pointOffset
                    pointCount = ring.pointCount
                    outline = geometry.outlinePoints
                }
                let ring = (pointOffset: pointOffset, pointCount: pointCount)
                guard ring.pointCount >= 2 else { continue }
                let points = (0..<ring.pointCount).map { offset -> SIMD3<Float> in
                    let point = outline[pointOffset + offset]
                    return GlobeMath.unitVector(lat: Double(point.y), lon: Double(point.x))
                }
                let outward = outwardSign(of: points)
                for offset in 0..<ring.pointCount {
                    let a = points[offset]
                    let b = points[(offset + 1) % ring.pointCount]
                    let side = sideNormal(from: a, to: b, sign: outward)
                    let base = UInt32(faceCount + vertices.count)
                    for (point, radius) in [(a, landRadius), (a, landBaseRadius), (b, landRadius), (b, landBaseRadius)] {
                        let position = point * radius
                        let top = radius == landRadius
                        // The normal turns from up-and-out at the coastline to
                        // straight out at the waterline. Interpolated across the
                        // quad that is a rounded edge, for four vertices rather
                        // than the twelve a real bevel would cost.
                        let normal = top
                            ? simd_normalize(point * 0.62 + side * 0.78)
                            : simd_normalize(side - point * 0.18)
                        vertices.append(GlobeLandVertex(
                            x: position.x, y: position.y, z: position.z,
                            country: Float(index), color: colorIndex,
                            shade: top ? coastShade : edgeShade,
                            nx: normal.x, ny: normal.y, nz: normal.z
                        ))
                    }
                    indices.append(contentsOf: [base, base + 1, base + 2])
                    indices.append(contentsOf: [base + 2, base + 1, base + 3])
                }
            }
        }
        return (vertices, indices)
    }

    /// Which way the cut edge faces: along the surface, at right angles to the
    /// coastline, pointing out to sea.
    static func sideNormal(from a: SIMD3<Float>, to b: SIMD3<Float>, sign: Float) -> SIMD3<Float> {
        let along = b - a
        guard simd_length(along) > 1e-7 else { return a }
        let side = simd_cross(simd_normalize(along), a)
        guard simd_length(side) > 1e-7 else { return a }
        return simd_normalize(side) * sign
    }

    /// The source rings do not agree on which way round they are wound, so
    /// which side is "out" is measured rather than assumed: flatten the ring
    /// onto the surface under its own middle and take the sign of its area.
    /// Positive is anticlockwise seen from space, and there the sea is to the
    /// right of the way the coastline runs.
    static func outwardSign(of points: [SIMD3<Float>]) -> Float {
        var centre = SIMD3<Float>.zero
        for point in points { centre += point }
        guard simd_length(centre) > 1e-6 else { return 1 }
        let up = simd_normalize(centre)
        var east = simd_cross(SIMD3<Float>(0, 0, 1), up)
        if simd_length(east) < 1e-6 { east = simd_cross(SIMD3<Float>(1, 0, 0), up) }
        east = simd_normalize(east)
        let north = simd_cross(up, east)
        var area: Float = 0
        for offset in 0..<points.count {
            let a = points[offset]
            let b = points[(offset + 1) % points.count]
            area += simd_dot(a, east) * simd_dot(b, north) - simd_dot(b, east) * simd_dot(a, north)
        }
        return area >= 0 ? 1 : -1
    }

    /// Rivers: the same mitred strip, but open — a river has two ends.
    static func riverVertices(for water: GlobeWater) -> (vertices: [GlobeBorderVertex], indices: [UInt32]) {
        var vertices: [GlobeBorderVertex] = []
        var indices: [UInt32] = []
        for line in water.rivers {
            guard line.pointCount >= 2 else { continue }
            let base = UInt32(vertices.count)
            for offset in 0..<line.pointCount {
                let point = water.riverPoints[line.pointOffset + offset]
                let current = GlobeMath.unitVector(lat: Double(point.y), lon: Double(point.x)) * borderRadius
                let previousPoint = water.riverPoints[line.pointOffset + max(0, offset - 1)]
                let nextPoint = water.riverPoints[line.pointOffset + min(line.pointCount - 1, offset + 1)]
                let previous = GlobeMath.unitVector(lat: Double(previousPoint.y), lon: Double(previousPoint.x)) * borderRadius
                let next = GlobeMath.unitVector(lat: Double(nextPoint.y), lon: Double(nextPoint.x)) * borderRadius
                let normal = simd_normalize(current)
                let incoming = sidewaysDirection(at: current, from: previous, to: current, normal: normal)
                let outgoing = sidewaysDirection(at: current, from: current, to: next, normal: normal)
                var miter = incoming + outgoing
                let length = simd_length(miter)
                if length < 1e-6 {
                    miter = simd_length(outgoing) > 0 ? outgoing : incoming
                } else {
                    miter /= length
                    miter *= 1 / max(0.4, simd_dot(miter, simd_length(outgoing) > 0 ? outgoing : incoming))
                }
                for side in [Float(-1), Float(1)] {
                    vertices.append(GlobeBorderVertex(
                        x: current.x, y: current.y, z: current.z,
                        px: miter.x, py: miter.y, pz: miter.z,
                        // −1 is no country, so a river never lifts with a selection.
                        side: side, country: -1
                    ))
                }
            }
            for offset in 0..<(line.pointCount - 1) {
                let here = base + UInt32(offset * 2)
                let there = here + 2
                indices.append(contentsOf: [here, here + 1, there])
                indices.append(contentsOf: [there, here + 1, there + 1])
            }
        }
        return (vertices, indices)
    }

    /// Lakes are flat fills, painted in the ocean's colour.
    static func lakeVertices(for water: GlobeWater) -> [GlobePositionVertex] {
        water.lakeVertices.map { point in
            let position = GlobeMath.unitVector(lat: Double(point.y), lon: Double(point.x)) * borderRadius
            return GlobePositionVertex(x: position.x, y: position.y, z: position.z)
        }
    }

    /// A continuous mitred strip per ring: two vertices per outline point,
    /// offset along the bisector of the two segments meeting there. Building it
    /// per segment instead leaves every corner unjoined, which at close zoom
    /// splays the border into a row of loose tabs.
    static func borderVertices(for geography: GlobeGeography) -> (vertices: [GlobeBorderVertex], indices: [UInt32]) {
        let geometry = geography.geometry
        var vertices: [GlobeBorderVertex] = []
        var indices: [UInt32] = []
        vertices.reserveCapacity(geometry.outlinePoints.count * 2)
        indices.reserveCapacity(geometry.outlinePoints.count * 6)

        for (index, country) in geometry.countries.enumerated() {
            let countryIndex = Float(index)
            for ringIndex in country.ringOffset..<(country.ringOffset + country.ringCount) {
                let ring = geometry.rings[ringIndex]
                guard ring.pointCount >= 3 else { continue }
                let base = UInt32(vertices.count)

                for offset in 0..<ring.pointCount {
                    let previous = point(of: ring, at: (offset + ring.pointCount - 1) % ring.pointCount, in: geometry)
                    let current = point(of: ring, at: offset, in: geometry)
                    let next = point(of: ring, at: (offset + 1) % ring.pointCount, in: geometry)
                    let normal = simd_normalize(current)
                    let incoming = sidewaysDirection(at: current, from: previous, to: current, normal: normal)
                    let outgoing = sidewaysDirection(at: current, from: current, to: next, normal: normal)

                    // The bisector, lengthened by how sharp the corner is, so
                    // the outer edge of the turn stays the same thickness.
                    var miter = incoming + outgoing
                    let length = simd_length(miter)
                    if length < 1e-6 {
                        miter = outgoing
                    } else {
                        miter /= length
                        // Capped, or a hairpin corner would throw a spike.
                        miter *= 1 / max(0.4, simd_dot(miter, outgoing))
                    }

                    for side in [Float(-1), Float(1)] {
                        vertices.append(GlobeBorderVertex(
                            x: current.x, y: current.y, z: current.z,
                            px: miter.x, py: miter.y, pz: miter.z,
                            side: side, country: countryIndex
                        ))
                    }
                }

                for offset in 0..<ring.pointCount {
                    let here = base + UInt32(offset * 2)
                    let there = base + UInt32(((offset + 1) % ring.pointCount) * 2)
                    indices.append(contentsOf: [here, here + 1, there])
                    indices.append(contentsOf: [there, here + 1, there + 1])
                }
            }
        }
        return (vertices, indices)
    }

    private static func point(of ring: GlobeGeometry.Ring, at offset: Int, in geometry: GlobeGeometry) -> SIMD3<Float> {
        let value = geometry.outlinePoints[ring.pointOffset + offset]
        return GlobeMath.unitVector(lat: Double(value.y), lon: Double(value.x)) * borderRadius
    }

    /// Across the border, along the surface: perpendicular to both the segment
    /// and the globe's normal at that point.
    private static func sidewaysDirection(
        at point: SIMD3<Float>,
        from start: SIMD3<Float>,
        to end: SIMD3<Float>,
        normal: SIMD3<Float>
    ) -> SIMD3<Float> {
        let along = end - start
        guard simd_length(along) > 1e-7 else { return SIMD3<Float>(0, 0, 0) }
        let sideways = simd_cross(normal, simd_normalize(along))
        let length = simd_length(sideways)
        return length > 1e-7 ? sideways / length : SIMD3<Float>(0, 0, 0)
    }

    static func sphere(rings: Int = 96, segments: Int = 192, radius: Float = oceanRadius)
        -> (vertices: [GlobePositionVertex], indices: [UInt32]) {
        var vertices: [GlobePositionVertex] = []
        var indices: [UInt32] = []
        for ring in 0...rings {
            let v = Double(ring) / Double(rings)
            let lat = 90 - v * 180
            for segment in 0...segments {
                let u = Double(segment) / Double(segments)
                let lon = -180 + u * 360
                let position = GlobeMath.unitVector(lat: lat, lon: lon) * radius
                vertices.append(GlobePositionVertex(x: position.x, y: position.y, z: position.z))
            }
        }
        let stride = segments + 1
        for ring in 0..<rings {
            for segment in 0..<segments {
                let topLeft = UInt32(ring * stride + segment)
                let topRight = topLeft + 1
                let bottomLeft = UInt32((ring + 1) * stride + segment)
                let bottomRight = bottomLeft + 1
                indices.append(contentsOf: [topLeft, bottomLeft, topRight])
                indices.append(contentsOf: [topRight, bottomLeft, bottomRight])
            }
        }
        return (vertices, indices)
    }
}

/// Everything the GPU needs, built from the geography once and away from the
/// main thread — a million-odd vertices is not work to do while the first frame
/// is waiting.
struct GlobeMeshes: Sendable {
    var land: [GlobeLandVertex]
    var landIndices: [UInt32]
    var border: [GlobeBorderVertex]
    var borderIndices: [UInt32]
    var ocean: [GlobePositionVertex]
    var oceanIndices: [UInt32]
    var river: [GlobeBorderVertex]
    var riverIndices: [UInt32]
    var lake: [GlobePositionVertex]
    var lakeIndices: [UInt32]
    /// Where each country's triangles sit in `landIndices`.
    var countryIndexRanges: [Range<Int>]

    static func build(
        for geography: GlobeGeography,
        water: GlobeWater?,
        subdivisions: GlobeSubdivisionGeometry? = nil
    ) -> GlobeMeshes {
        let units = GlobeMeshBuilder.units(for: geography, subdivisions: subdivisions)
        let faces = GlobeMeshBuilder.landVertices(for: geography, subdivisions: subdivisions, units: units)
        var faceIndices = GlobeMeshBuilder.landIndices(for: geography, subdivisions: subdivisions, units: units)
        let walls = GlobeMeshBuilder.wallVertices(
            for: geography, subdivisions: subdivisions, units: units, faceCount: faces.count
        )
        faceIndices.append(contentsOf: walls.indices)
        let border = GlobeMeshBuilder.borderVertices(for: geography)
        let sphere = GlobeMeshBuilder.sphere()
        let rivers = water.map(GlobeMeshBuilder.riverVertices) ?? (vertices: [], indices: [])
        return GlobeMeshes(
            land: faces + walls.vertices,
            landIndices: faceIndices,
            border: border.vertices,
            borderIndices: border.indices,
            ocean: sphere.vertices,
            oceanIndices: sphere.indices,
            river: rivers.vertices,
            riverIndices: rivers.indices,
            lake: water.map(GlobeMeshBuilder.lakeVertices) ?? [],
            lakeIndices: water?.lakeIndices ?? [],
            countryIndexRanges: GlobeMeshBuilder.landIndexRanges(for: geography, units: units)
        )
    }
}

/// Draws the Earth: an ocean sphere, the country slabs, the borders on top.
/// Everything the frame needs is set from the main thread before the draw, so
/// the renderer itself holds no mutable state a gesture could race.
final class GlobeRenderer: NSObject, MTKViewDelegate {
    private let device: MTLDevice
    private let commandQueue: MTLCommandQueue
    private let oceanPipeline: MTLRenderPipelineState
    private let landPipeline: MTLRenderPipelineState
    private let borderPipeline: MTLRenderPipelineState
    private let shadowPipeline: MTLRenderPipelineState
    /// The sea floor: one greyscale channel, deepest white. Optional because a
    /// globe with a plain blue ocean is still a globe.
    private let bathymetry: MTLTexture?
    private let shadowDepthState: MTLDepthStencilState
    private let countryIndexRanges: [Range<Int>]
    private let depthState: MTLDepthStencilState

    private let oceanVertices: MTLBuffer
    private let oceanIndices: MTLBuffer
    private let oceanIndexCount: Int
    private let landVertices: MTLBuffer
    private let landIndices: MTLBuffer
    private let landIndexCount: Int
    private let borderVertices: MTLBuffer
    private let borderIndices: MTLBuffer
    private let borderIndexCount: Int
    private let riverVertices: MTLBuffer?
    private let riverIndices: MTLBuffer?
    private let riverIndexCount: Int
    private let lakeVertices: MTLBuffer?
    private let lakeIndices: MTLBuffer?
    private let lakeIndexCount: Int
    private var countryColors: MTLBuffer
    private let countryCount: Int
    private let climates: [GlobeClimate]

    /// Set from the main thread between frames.
    var camera = GlobeCamera()
    var selectedCountryIndex: Int?
    /// 0 flush with the surface, 1 fully popped out.
    var selectionLift: Float = 0
    /// Border weight in points; the shader converts it to world units per frame.
    var borderWidthPoints: Float { appearance.borderWidth }
    var appearance: GlobeAppearance {
        didSet { updateCountryColors() }
    }
    /// Called once per frame with the elapsed time, so momentum and focus
    /// animations advance on the display's clock rather than a timer of ours.
    var onFrame: ((Double) -> Void)?

    private var lastFrameTime: CFTimeInterval?

    init?(device: MTLDevice, meshes: GlobeMeshes, climates: [GlobeClimate], appearance: GlobeAppearance) {
        guard let queue = device.makeCommandQueue(), let library = device.makeDefaultLibrary() else { return nil }
        self.device = device
        commandQueue = queue
        self.appearance = appearance

        func pipeline(vertex: String, fragment: String, blended: Bool = false) -> MTLRenderPipelineState? {
            let descriptor = MTLRenderPipelineDescriptor()
            descriptor.vertexFunction = library.makeFunction(name: vertex)
            descriptor.fragmentFunction = library.makeFunction(name: fragment)
            descriptor.colorAttachments[0].pixelFormat = .bgra8Unorm
            if blended {
                descriptor.colorAttachments[0].isBlendingEnabled = true
                descriptor.colorAttachments[0].sourceRGBBlendFactor = .sourceAlpha
                descriptor.colorAttachments[0].destinationRGBBlendFactor = .oneMinusSourceAlpha
                descriptor.colorAttachments[0].sourceAlphaBlendFactor = .sourceAlpha
                descriptor.colorAttachments[0].destinationAlphaBlendFactor = .oneMinusSourceAlpha
            }
            descriptor.depthAttachmentPixelFormat = .depth32Float
            descriptor.rasterSampleCount = GlobeRenderer.sampleCount
            return try? device.makeRenderPipelineState(descriptor: descriptor)
        }
        guard let ocean = pipeline(vertex: "ocean_vertex", fragment: "ocean_fragment"),
              let land = pipeline(vertex: "land_vertex", fragment: "land_fragment"),
              let border = pipeline(vertex: "border_vertex", fragment: "border_fragment"),
              let shadow = pipeline(vertex: "shadow_vertex", fragment: "shadow_fragment", blended: true)
        else { return nil }
        oceanPipeline = ocean
        landPipeline = land
        borderPipeline = border
        shadowPipeline = shadow
        countryIndexRanges = meshes.countryIndexRanges

        bathymetry = GlobeRenderer.loadBathymetry(device: device)

        let depthDescriptor = MTLDepthStencilDescriptor()
        depthDescriptor.depthCompareFunction = .less
        depthDescriptor.isDepthWriteEnabled = true
        guard let depth = device.makeDepthStencilState(descriptor: depthDescriptor) else { return nil }
        depthState = depth

        // The shadow reads the depth buffer but does not write to it: it is a
        // mark on the sea floor, not something else can hide behind.
        let shadowDepthDescriptor = MTLDepthStencilDescriptor()
        shadowDepthDescriptor.depthCompareFunction = .less
        shadowDepthDescriptor.isDepthWriteEnabled = false
        guard let shadowDepth = device.makeDepthStencilState(descriptor: shadowDepthDescriptor) else { return nil }
        shadowDepthState = shadowDepth

        func buffer<T>(_ values: [T]) -> MTLBuffer? {
            guard !values.isEmpty else { return nil }
            return values.withUnsafeBytes { raw in
                device.makeBuffer(bytes: raw.baseAddress!, length: raw.count, options: .storageModeShared)
            }
        }
        guard let oceanVertexBuffer = buffer(meshes.ocean),
              let oceanIndexBuffer = buffer(meshes.oceanIndices),
              let landVertexBuffer = buffer(meshes.land),
              let landIndexBuffer = buffer(meshes.landIndices),
              let borderVertexBuffer = buffer(meshes.border),
              let borderIndexBuffer = buffer(meshes.borderIndices),
              let colors = device.makeBuffer(
                  length: MemoryLayout<SIMD4<Float>>.stride * max(1, climates.count),
                  options: .storageModeShared
              )
        else { return nil }
        oceanVertices = oceanVertexBuffer
        oceanIndices = oceanIndexBuffer
        oceanIndexCount = meshes.oceanIndices.count
        landVertices = landVertexBuffer
        landIndices = landIndexBuffer
        landIndexCount = meshes.landIndices.count
        borderVertices = borderVertexBuffer
        borderIndices = borderIndexBuffer
        borderIndexCount = meshes.borderIndices.count
        riverVertices = buffer(meshes.river)
        riverIndices = buffer(meshes.riverIndices)
        riverIndexCount = meshes.riverIndices.count
        lakeVertices = buffer(meshes.lake)
        lakeIndices = buffer(meshes.lakeIndices)
        lakeIndexCount = meshes.lakeIndices.count
        countryColors = colors
        countryCount = climates.count
        self.climates = climates

        super.init()
        updateCountryColors()
    }

    static let sampleCount = 4

    /// Where the sea surface sits this frame: just under the foot of the land,
    /// wherever that has moved to. Left behind, the water shows a gap at every
    /// coast that a child can see straight through — the globe stops being
    /// solid, which is the one thing it always has to be.
    private var seaRadius: Float {
        min(GlobeMeshBuilder.landRadius - 0.0004, slabBaseRadius - 0.0007)
    }

    /// How deep a country's slab is this frame. Baked at full depth and pulled
    /// back up as the child comes closer: from the whole Earth the thickness is
    /// what makes the countries read as pieces laid on a ball, and from inside
    /// one country the same thickness is a wall around it.
    private var slabBaseRadius: Float {
        let radius = camera.visibleRadiusDegrees
        let depth = Float(min(1, max(0.22, 0.22 + 0.78 * (radius / 28))))
        let full = GlobeMeshBuilder.landRadius - GlobeMeshBuilder.landBaseRadius
        return GlobeMeshBuilder.landRadius - full * depth
    }

    /// How much of its weight a river keeps at this zoom. A border holds the
    /// same thickness whatever the camera does, and that is right for a border
    /// — but every river on Earth at full weight is a net thrown over the
    /// planet. They thin out as the child pulls back, until at the whole Earth
    /// they are the hint of a line.
    private var riverWeight: Float {
        let radius = camera.visibleRadiusDegrees
        switch radius {
        case ..<4: return 1
        case ..<12: return 0.8
        case ..<30: return 0.6
        case ..<50: return 0.45
        default: return 0.35
        }
    }

    /// The world-space half-width that draws `borderWidthPoints` on screen at
    /// the current camera distance — so a border keeps its weight whether the
    /// child is looking at the planet or at one country.
    private func borderHalfWidth(drawableHeight: Double, scale: Double, points: Float? = nil) -> Float {
        guard drawableHeight > 0 else { return 0 }
        let halfFov = GlobeCamera.fieldOfViewDegrees / 2 * .pi / 180
        let worldPerPixel = 2 * camera.distance * tan(halfFov) / drawableHeight
        return Float(worldPerPixel * Double(points ?? borderWidthPoints) * max(scale, 1) / 2)
    }

    /// One colour per country: its climate's, nudged by a value derived from
    /// its position in the table. Two neighbours in the same climate would
    /// otherwise melt into one shape now that there are no outlines.
    private func updateCountryColors() {
        guard countryCount > 0 else { return }
        let pointer = countryColors.contents().bindMemory(to: SIMD4<Float>.self, capacity: countryCount)
        for index in 0..<countryCount {
            let base = GlobeAppearance.landColor(for: climates[index], dark: appearance.isDark)
            // A repeating, deterministic wobble — nothing a child would read as
            // meaning, enough for one country to end where the next begins.
            let tone = Float(1 + (Double((index &* 7) % 5) - 2) * 0.022)
            pointer[index] = SIMD4<Float>(
                min(1, base.x * tone), min(1, base.y * tone), min(1, base.z * tone), 1
            )
        }
    }

    /// The depth image ships beside the geometry it belongs to. Loaded without
    /// mipmaps: the sea floor is a smooth field and a blurred one at distance
    /// loses exactly the ridges this is for.
    private static func loadBathymetry(device: MTLDevice) -> MTLTexture? {
        let bundle = Bundle(for: GlobeRenderer.self)
        guard let url = bundle.url(forResource: "bathymetry", withExtension: "png", subdirectory: "generated")
            ?? bundle.url(forResource: "bathymetry", withExtension: "png")
            ?? Bundle.main.url(forResource: "bathymetry", withExtension: "png", subdirectory: "generated")
        else { return nil }
        return try? MTKTextureLoader(device: device).newTexture(URL: url, options: [
            .SRGB: false,
            .textureUsage: NSNumber(value: MTLTextureUsage.shaderRead.rawValue),
            .textureStorageMode: NSNumber(value: MTLStorageMode.private.rawValue)
        ])
    }

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

    func draw(in view: MTKView) {
        let now = CACurrentMediaTime()
        let elapsed = lastFrameTime.map { now - $0 } ?? 0
        lastFrameTime = now
        onFrame?(min(elapsed, 0.1))

        guard let descriptor = view.currentRenderPassDescriptor,
              let drawable = view.currentDrawable,
              let commandBuffer = commandQueue.makeCommandBuffer(),
              let encoder = commandBuffer.makeRenderCommandEncoder(descriptor: descriptor)
        else { return }

        let size = view.drawableSize
        var uniforms = GlobeUniforms(
            viewProjection: camera.viewProjectionMatrix(aspect: Double(size.width) / Double(max(1, size.height))),
            lightDirection: camera.globeSpaceLightDirection,
            selectedCountry: Int32(selectedCountryIndex ?? -1),
            horizonCosine: Float(camera.horizonCosine),
            selectionLift: selectionLift,
            selectionLiftDistance: Float(camera.selectionLiftDistance),
            borderHalfWidth: borderHalfWidth(drawableHeight: Double(size.height), scale: Double(view.contentScaleFactor)),
            cameraDirection: camera.globeSpaceCameraDirection,
            oceanColor: appearance.ocean,
            atmosphereColor: appearance.atmosphere,
            borderColor: appearance.border,
            highlightColor: appearance.highlight,
            selectedBorderColor: appearance.selectedBorder,
            shadowColor: appearance.shadow,
            shadowRadius: max(GlobeMeshBuilder.shadowRadius, seaRadius + 0.0003),
            slabBaseRadius: slabBaseRadius,
            surfaceScale: seaRadius / GlobeMeshBuilder.oceanRadius,
            deepOceanColor: appearance.deepOcean,
            hasBathymetry: bathymetry == nil ? 0 : 1,
            flatShading: 0
        )

        encoder.setDepthStencilState(depthState)
        encoder.setCullMode(.back)
        encoder.setRenderPipelineState(oceanPipeline)
        encoder.setVertexBuffer(oceanVertices, offset: 0, index: 0)
        encoder.setVertexBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.setFragmentTexture(bathymetry, index: 0)
        encoder.drawIndexedPrimitives(
            type: .triangle, indexCount: oceanIndexCount, indexType: .uint32,
            indexBuffer: oceanIndices, indexBufferOffset: 0
        )

        // The hole a lifted country leaves behind, filled with its own shape.
        if let selected = selectedCountryIndex, selectionLift > 0.01,
           countryIndexRanges.indices.contains(selected) {
            let range = countryIndexRanges[selected]
            if !range.isEmpty {
                encoder.setCullMode(.none)
                encoder.setDepthStencilState(shadowDepthState)
                encoder.setRenderPipelineState(shadowPipeline)
                encoder.setVertexBuffer(landVertices, offset: 0, index: 0)
                encoder.setVertexBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
                encoder.setFragmentBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
                encoder.drawIndexedPrimitives(
                    type: .triangle, indexCount: range.count, indexType: .uint32,
                    indexBuffer: landIndices, indexBufferOffset: range.lowerBound * MemoryLayout<UInt32>.stride
                )
                encoder.setDepthStencilState(depthState)
            }
        }

        // Land keeps both faces: the depth buffer already hides whatever is
        // behind the ocean sphere, and winding varies across the source polygons.
        encoder.setCullMode(.none)
        encoder.setRenderPipelineState(landPipeline)
        encoder.setVertexBuffer(landVertices, offset: 0, index: 0)
        encoder.setVertexBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.setVertexBuffer(countryColors, offset: 0, index: 2)
        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.drawIndexedPrimitives(
            type: .triangle, indexCount: landIndexCount, indexType: .uint32,
            indexBuffer: landIndices, indexBufferOffset: 0
        )

        // A hair towards the camera in depth, rather than in space: the border
        // stays exactly on the fill's surface and still wins the depth test.
        // Water on top of the land it runs through, biased forward in depth
        // rather than lifted off the surface.
        encoder.setDepthBias(-0.00004, slopeScale: -1.2, clamp: -0.001)
        if let lakeVertices, let lakeIndices, lakeIndexCount > 0 {
            // A lake is drawn by the ocean's shader but is not the ocean: its own
            // colour, and no sea floor underneath it to tint it.
            var lakeUniforms = uniforms
            lakeUniforms.oceanColor = appearance.lake
            lakeUniforms.hasBathymetry = 0
            lakeUniforms.flatShading = 1
            // A lake sits on the land it is in, not on the sea's surface.
            lakeUniforms.surfaceScale = 1
            encoder.setRenderPipelineState(oceanPipeline)
            encoder.setCullMode(.none)
            encoder.setVertexBuffer(lakeVertices, offset: 0, index: 0)
            encoder.setVertexBytes(&lakeUniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
            encoder.setFragmentBytes(&lakeUniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
            encoder.drawIndexedPrimitives(
                type: .triangle, indexCount: lakeIndexCount, indexType: .uint32,
                indexBuffer: lakeIndices, indexBufferOffset: 0
            )
        }
        if let riverVertices, let riverIndices, riverIndexCount > 0 {
            var riverUniforms = uniforms
            riverUniforms.borderColor = appearance.river
            riverUniforms.selectedBorderColor = appearance.river
            riverUniforms.borderHalfWidth = borderHalfWidth(
                drawableHeight: Double(size.height),
                scale: Double(view.contentScaleFactor),
                points: appearance.riverWidth * riverWeight
            )
            encoder.setRenderPipelineState(borderPipeline)
            encoder.setVertexBuffer(riverVertices, offset: 0, index: 0)
            encoder.setVertexBytes(&riverUniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
            encoder.setFragmentBytes(&riverUniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
            encoder.drawIndexedPrimitives(
                type: .triangle, indexCount: riverIndexCount, indexType: .uint32,
                indexBuffer: riverIndices, indexBufferOffset: 0
            )
        }
        encoder.setDepthBias(0, slopeScale: 0, clamp: 0)

        guard appearance.borderWidth > 0 else {
            encoder.endEncoding()
            commandBuffer.present(drawable)
            commandBuffer.commit()
            return
        }
        encoder.setDepthBias(-0.00004, slopeScale: -1.2, clamp: -0.001)
        encoder.setRenderPipelineState(borderPipeline)
        encoder.setVertexBuffer(borderVertices, offset: 0, index: 0)
        encoder.setVertexBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<GlobeUniforms>.stride, index: 1)
        encoder.drawIndexedPrimitives(
            type: .triangle, indexCount: borderIndexCount, indexType: .uint32,
            indexBuffer: borderIndices, indexBufferOffset: 0
        )
        encoder.setDepthBias(0, slopeScale: 0, clamp: 0)

        encoder.endEncoding()
        commandBuffer.present(drawable)
        commandBuffer.commit()
    }
}
